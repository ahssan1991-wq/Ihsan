/**
 * Camera Permission Request Helper & Diagnostics
 * Handles browser/OS camera permission checks, requests, and structured error resolutions.
 */

export type CameraPermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface CameraRequestResult {
  success: boolean;
  stream?: MediaStream;
  status: CameraPermissionStatus;
  errorCode?: string;
  errorMessage?: string;
  errorGuide?: {
    title: string;
    description: string;
    steps: string[];
    canRetry: boolean;
    suggestNativeFallback: boolean;
  };
}

/**
 * Proactively checks the browser's current camera permission state using the Permissions API.
 */
export async function checkCameraPermission(): Promise<CameraPermissionStatus> {
  if (typeof navigator === 'undefined' || !navigator.permissions || !navigator.permissions.query) {
    return 'unsupported';
  }

  try {
    const permissionStatus = await navigator.permissions.query({ name: 'camera' as any });
    return permissionStatus.state as CameraPermissionStatus;
  } catch (e) {
    // Some browsers do not support { name: 'camera' } in permissions.query
    return 'prompt';
  }
}

/**
 * Requests camera access with exact constraints and provides comprehensive error diagnostics
 */
export async function requestCameraAccess(
  facingMode: 'environment' | 'user' = 'environment'
): Promise<CameraRequestResult> {
  // Check if getUserMedia is supported in current environment
  if (
    typeof navigator === 'undefined' ||
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {
    return {
      success: false,
      status: 'unsupported',
      errorCode: 'NOT_SUPPORTED',
      errorMessage: 'المتصفح أو البيئة الحالية لا تدعم تشغيل الكاميرا المباشرة عبر WebRTC.',
      errorGuide: {
        title: 'الكاميرا المباشرة غير مدعومة في هذه البيئة',
        description: 'لا تتوفر ميزة البث المباشر في هذا المتصفح، ولكن يمكنك استخدام كاميرا الهاتف الرسمية مباشرة.',
        steps: [
          'اضغط على زر "استخدام كاميرا الهاتف المباشرة" لتشغيل تطبيق الكاميرا الرسمي.',
          'التقط صورة واضحة للباركود أو لوحة المادة.',
          'سيتم التعرف على البيانات ومطابقة المخزون تلقائياً.'
        ],
        canRetry: false,
        suggestNativeFallback: true
      }
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    });

    return {
      success: true,
      stream,
      status: 'granted'
    };
  } catch (err: any) {
    console.error('Camera request error details:', err);
    const errName = err?.name || '';
    const isDenied = errName === 'NotAllowedError' || errName === 'PermissionDeniedError';
    const isNotFound = errName === 'NotFoundError' || errName === 'DevicesNotFoundError';
    const isInUse = errName === 'NotReadableError' || errName === 'TrackStartError';
    const isOverconstrained = errName === 'OverconstrainedError' || errName === 'ConstraintNotSatisfiedError';
    const isSecurity = errName === 'SecurityError';

    if (isDenied) {
      return {
        success: false,
        status: 'denied',
        errorCode: 'PERMISSION_DENIED',
        errorMessage: 'تم رفض إذن الوصول للكاميرا من قبل المستخدم أو إعدادات المتصفح.',
        errorGuide: {
          title: 'تم حظر إذن الكاميرا (Permission Denied)',
          description: 'يحتاج الماسح الضوئي إلى إذن الكاميرا لمسح الباركود وQR ولوحات المواد فورياً.',
          steps: [
            'اضغط على أيقونة القفل أو الإعدادات 🔒 بجانب رابط الموقع في شريط العنوان بالمتصفح.',
            'ابحث عن خيار "الكاميرا / Camera" وقم بتغييره إلى "السماح / Allow".',
            'في هواتف Android: انتقل إلى إعدادات الهاتف > التطبيقات > المتصفح > الأذونات > الكاميرا > السماح.',
            'بعد تفعيل الإذن، اضغط على زر "إعادة طلب الإذن والمحاولة" بالأسفل أو أعد تحميل الصفحة.'
          ],
          canRetry: true,
          suggestNativeFallback: true
        }
      };
    }

    if (isNotFound) {
      return {
        success: false,
        status: 'unsupported',
        errorCode: 'NO_CAMERA_FOUND',
        errorMessage: 'لم يتم العثور على أي كاميرا متصلة بالجهاز.',
        errorGuide: {
          title: 'لم يتم العثور على كاميرا',
          description: 'الجهاز الحالي لا يحتوي على جهاز كاميرا متاح أو تم فصله.',
          steps: [
            'تأكد من توصيل كاميرا الويب بالجهاز.',
            'أو استخدم ميزة "رفع صورة من المعرض" لمسح الصور المحفوظة.'
          ],
          canRetry: true,
          suggestNativeFallback: true
        }
      };
    }

    if (isInUse) {
      return {
        success: false,
        status: 'denied',
        errorCode: 'CAMERA_IN_USE',
        errorMessage: 'الكاميرا مستخدمة حالياً بواسطة تطبيق أو تبويب آخر.',
        errorGuide: {
          title: 'الكاميرا قيد الاستخدام',
          description: 'هناك تطبيق آخر (مثل Zoom أو Teams أو تبويب آخر) يستخدم الكاميرا الآن.',
          steps: [
            'أغلق أي تطبيق آخر يستخدم الكاميرا.',
            'اضغط على "إعادة المحاولة" بعد إغلاق التطبيقات الأخرى.'
          ],
          canRetry: true,
          suggestNativeFallback: true
        }
      };
    }

    if (isOverconstrained) {
      // Fallback try with basic video constraints
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        return {
          success: true,
          stream: fallbackStream,
          status: 'granted'
        };
      } catch (fallbackErr) {
        // Continue to generic error
      }
    }

    return {
      success: false,
      status: 'denied',
      errorCode: errName || 'UNKNOWN_ERROR',
      errorMessage: err?.message || 'تعذر تشغيل الكاميرا المباشرة.',
      errorGuide: {
        title: 'تعذر الوصول إلى الكاميرا',
        description: 'حدث خطأ غير متوقع أثناء محاولة تشغيل الكاميرا.',
        steps: [
          'تأكد من منح أذونات الكاميرا للمتصفح.',
          'استخدم زر "كاميرا الهاتف المباشرة" كبديل سريع وموثوق.',
          'أو اختر صورة من المعرض مباشرة.'
        ],
        canRetry: true,
        suggestNativeFallback: true
      }
    };
  }
}
