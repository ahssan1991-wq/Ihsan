/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Reuse existing app if already initialized, or initialize with real user config
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Approved Google Drive scope configured via OAuth setup (Least privilege: drive.file)
provider.addScope('https://www.googleapis.com/auth/drive.file');

let forceSandbox = false;
try {
  forceSandbox = localStorage.getItem('emis_force_sandbox') === 'true';
} catch (e) {}

export const setForceSandbox = (val: boolean) => {
  forceSandbox = val;
  try {
    if (val) {
      localStorage.setItem('emis_force_sandbox', 'true');
    } else {
      localStorage.removeItem('emis_force_sandbox');
    }
  } catch (e) {}
};

export const getForceSandbox = () => forceSandbox;

export const isFirebaseConfigured = () => {
  if (forceSandbox) {
    return false;
  }
  return firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== 'remixed-api-key' && !firebaseConfig.apiKey.startsWith('remixed-');
};

let isSigningIn = false;
let cachedAccessToken: string | null = null;

const SANDBOX_USER_KEY = 'emis_sandbox_user';
const SANDBOX_TOKEN_KEY = 'emis_sandbox_token';

// Listen to auth state and store/clear access token in memory
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (!isFirebaseConfigured()) {
    const savedUser = sessionStorage.getItem(SANDBOX_USER_KEY);
    const savedToken = sessionStorage.getItem(SANDBOX_TOKEN_KEY);
    if (savedUser && savedToken) {
      cachedAccessToken = savedToken;
      const parsedUser = JSON.parse(savedUser);
      setTimeout(() => {
        if (onAuthSuccess) onAuthSuccess(parsedUser, savedToken);
      }, 50);
    } else {
      setTimeout(() => {
        if (onAuthFailure) onAuthFailure();
      }, 50);
    }
    return () => {};
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (!isFirebaseConfigured()) {
    isSigningIn = true;
    await new Promise(resolve => setTimeout(resolve, 800));
    const mockUser: any = {
      uid: 'sandbox-usr-drive-01',
      email: 'sandbox-operator@emis.com',
      displayName: 'Sandbox Operator',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop',
      emailVerified: true
    };
    cachedAccessToken = 'sandbox-drive-access-token-9988';
    sessionStorage.setItem(SANDBOX_USER_KEY, JSON.stringify(mockUser));
    sessionStorage.setItem(SANDBOX_TOKEN_KEY, cachedAccessToken);
    isSigningIn = false;
    return { user: mockUser, accessToken: cachedAccessToken };
  }

  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  if (!isFirebaseConfigured()) {
    sessionStorage.removeItem(SANDBOX_USER_KEY);
    sessionStorage.removeItem(SANDBOX_TOKEN_KEY);
    cachedAccessToken = null;
    return;
  }

  try {
    await auth.signOut();
  } catch (e) {
    console.warn("Auth sign out error:", e);
  }
  cachedAccessToken = null;
};

// Google Drive API Integration functions

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  size?: string;
  createdTime?: string;
}

const INITIAL_SANDBOX_FILES: DriveFile[] = [
  {
    id: 'sb-file-01',
    name: 'ZFOD EMIS Document Vault',
    mimeType: 'application/vnd.google-apps.folder',
    createdTime: '2026-07-01T12:00:00.000Z'
  },
  {
    id: 'sb-file-02',
    name: 'HBR_Centrifugal_Pump_Datasheet.pdf',
    mimeType: 'application/pdf',
    webViewLink: 'https://example.com/simulated-pump-datasheet.pdf',
    size: '1248000',
    createdTime: '2026-07-02T14:30:00.000Z'
  },
  {
    id: 'sb-file-03',
    name: 'Certificate_of_Conformity_Valves.pdf',
    mimeType: 'application/pdf',
    webViewLink: 'https://example.com/simulated-coc-valves.pdf',
    size: '482000',
    createdTime: '2026-07-03T09:15:00.000Z'
  },
  {
    id: 'sb-file-04',
    name: 'Flange_Gasket_Standard_Drawings.dwg',
    mimeType: 'application/octet-stream',
    webViewLink: 'https://example.com/simulated-dwg.dwg',
    size: '4560000',
    createdTime: '2026-07-04T11:00:00.000Z'
  }
];

const getSandboxFiles = (): DriveFile[] => {
  const stored = localStorage.getItem('emis_sandbox_drive_files');
  if (!stored) {
    localStorage.setItem('emis_sandbox_drive_files', JSON.stringify(INITIAL_SANDBOX_FILES));
    return INITIAL_SANDBOX_FILES;
  }
  return JSON.parse(stored);
};

const saveSandboxFiles = (files: DriveFile[]) => {
  localStorage.setItem('emis_sandbox_drive_files', JSON.stringify(files));
};

// List files from Google Drive
export const listDriveFiles = async (q: string = "trashed = false", pageToken?: string): Promise<{ files: DriveFile[], nextPageToken?: string }> => {
  if (!isFirebaseConfigured()) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const allFiles = getSandboxFiles();
    
    let filtered = allFiles;
    if (q.includes("parents")) {
      const match = q.match(/'([^']+)' in parents/);
      if (match) {
        const parentId = match[1];
        filtered = allFiles.filter(f => {
          if (parentId === 'sb-file-01') {
            return f.id !== 'sb-file-01'; // children of the vault folder
          }
          // If searching for something else, return files matching
          return f.id !== parentId;
        });
      }
    } else {
      filtered = allFiles.filter(f => f.id !== 'sb-file-01');
    }

    return { files: filtered };
  }

  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google');

  const fields = 'nextPageToken, files(id, name, mimeType, webViewLink, size, createdTime)';
  let url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&pageSize=50`;
  if (pageToken) {
    url += `&pageToken=${pageToken}`;
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to list files from Google Drive');
  }

  const data = await res.json();
  return {
    files: data.files || [],
    nextPageToken: data.nextPageToken
  };
};

// Create a directory/folder in Google Drive
export const createDriveFolder = async (name: string, parentId?: string): Promise<string> => {
  if (!isFirebaseConfigured()) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const allFiles = getSandboxFiles();
    const newFolder: DriveFile = {
      id: `sb-folder-${Date.now()}`,
      name,
      mimeType: 'application/vnd.google-apps.folder',
      createdTime: new Date().toISOString()
    };
    allFiles.push(newFolder);
    saveSandboxFiles(allFiles);
    return newFolder.id;
  }

  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google');

  const body: any = {
    name,
    mimeType: 'application/vnd.google-apps.folder'
  };

  if (parentId) {
    body.parents = [parentId];
  }

  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to create folder in Google Drive');
  }

  const data = await res.json();
  return data.id;
};

// Find or create our default application folder "ZFOD EMIS Document Vault"
export const getOrCreateVaultFolder = async (): Promise<string> => {
  const folderName = "ZFOD EMIS Document Vault";
  const q = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const { files } = await listDriveFiles(q);
  
  if (files.length > 0) {
    return files[0].id;
  }
  
  return await createDriveFolder(folderName);
};

// Upload a file to Google Drive (multipart upload for name and contents)
export const uploadFileToDrive = async (file: File | Blob, customName?: string, folderId?: string): Promise<DriveFile> => {
  if (!isFirebaseConfigured()) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const fileName = customName || (file instanceof File ? file.name : 'upload.bin');
    const allFiles = getSandboxFiles();
    const newFile: DriveFile = {
      id: `sb-file-${Date.now()}`,
      name: fileName,
      mimeType: file.type || 'application/octet-stream',
      webViewLink: 'https://example.com/simulated-uploaded-document',
      size: String(file.size),
      createdTime: new Date().toISOString()
    };
    allFiles.push(newFile);
    saveSandboxFiles(allFiles);
    return newFile;
  }

  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google');

  const fileName = customName || (file instanceof File ? file.name : 'upload.bin');
  const metadata: any = {
    name: fileName
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  // Use Multipart upload
  const boundary = 'foo_bar_boundary';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const reader = new FileReader();
  const fileDataPromise = new Promise<string | ArrayBuffer | null>((resolve) => {
    reader.onload = () => resolve(reader.result);
    reader.readAsBinaryString(file);
  });

  const binaryContent = await fileDataPromise;
  if (typeof binaryContent !== 'string') {
    throw new Error('Failed to read file as binary string');
  }

  const mimeType = file.type || 'application/octet-stream';
  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: ' + mimeType + '\r\n\r\n' +
    binaryContent +
    closeDelimiter;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,size,createdTime', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to upload file to Google Drive');
  }

  return await res.json();
};

// Delete a file from Google Drive
export const deleteFileFromDrive = async (fileId: string): Promise<void> => {
  if (!isFirebaseConfigured()) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const allFiles = getSandboxFiles();
    const filtered = allFiles.filter(f => f.id !== fileId);
    saveSandboxFiles(filtered);
    return;
  }

  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to delete file from Google Drive');
  }
};
