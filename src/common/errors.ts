export interface BilingualErrorBody {
  error: string;
  error_description: string;
  error_i18n: { vi: string; en: string };
}

type ErrorCode =
  // auth
  | 'invalid_scope'
  | 'invalid_client'
  | 'redirect_uri_not_allowed'
  | 'session_expired'
  | 'invalid_credentials'
  | 'account_disabled'
  | 'no_google_account'
  | 'missing_request_id'
  // token
  | 'code_required'
  | 'redirect_uri_required'
  | 'client_id_required'
  | 'client_secret_required'
  | 'code_verifier_required'
  | 'auth_code_not_found'
  | 'auth_code_already_used'
  | 'auth_code_expired'
  | 'redirect_uri_mismatch'
  | 'client_id_mismatch'
  | 'unknown_client_id'
  | 'invalid_client_secret'
  | 'pkce_verification_failed'
  | 'user_not_found'
  // bearer guard
  | 'missing_bearer_token'
  | 'token_not_found_or_expired'
  // internal
  | 'internal_server_error';

const messages: Record<ErrorCode, { error: string; vi: string; en: string }> = {
  // auth
  invalid_scope: {
    error: 'invalid_scope',
    vi: 'scope phải bao gồm openid',
    en: 'scope must include openid',
  },
  invalid_client: {
    error: 'invalid_client',
    vi: 'Client không tồn tại hoặc không hoạt động',
    en: 'Unknown or inactive client_id',
  },
  redirect_uri_not_allowed: {
    error: 'invalid_request',
    vi: 'redirect_uri không được phép cho client này',
    en: 'redirect_uri not allowed for this client',
  },
  session_expired: {
    error: 'invalid_request',
    vi: 'Phiên đăng nhập đã hết hạn, vui lòng thử lại từ đầu.',
    en: 'Login session has expired, please try again from the beginning.',
  },
  invalid_credentials: {
    error: 'invalid_credentials',
    vi: 'Sai username/email hoặc mật khẩu.',
    en: 'Invalid username/email or password.',
  },
  account_disabled: {
    error: 'invalid_credentials',
    vi: 'Tài khoản đã bị vô hiệu hoá.',
    en: 'Account has been disabled.',
  },
  no_google_account: {
    error: 'invalid_credentials',
    vi: 'Không có tài khoản MPClub nào liên kết với email Google này.',
    en: 'No MPClub account is linked to this Google email.',
  },
  missing_request_id: {
    error: 'invalid_request',
    vi: 'Thiếu tham số request_id',
    en: 'Missing request_id parameter',
  },
  // token
  code_required: {
    error: 'invalid_request',
    vi: 'Thiếu tham số code',
    en: 'code is required',
  },
  redirect_uri_required: {
    error: 'invalid_request',
    vi: 'Thiếu tham số redirect_uri',
    en: 'redirect_uri is required',
  },
  client_id_required: {
    error: 'invalid_request',
    vi: 'Thiếu tham số client_id',
    en: 'client_id is required',
  },
  client_secret_required: {
    error: 'invalid_request',
    vi: 'Thiếu tham số client_secret',
    en: 'client_secret is required',
  },
  code_verifier_required: {
    error: 'invalid_request',
    vi: 'Thiếu tham số code_verifier',
    en: 'code_verifier is required',
  },
  auth_code_not_found: {
    error: 'invalid_grant',
    vi: 'Không tìm thấy authorization code',
    en: 'Authorization code not found',
  },
  auth_code_already_used: {
    error: 'invalid_grant',
    vi: 'Authorization code đã được sử dụng',
    en: 'Authorization code already used',
  },
  auth_code_expired: {
    error: 'invalid_grant',
    vi: 'Authorization code đã hết hạn',
    en: 'Authorization code expired',
  },
  redirect_uri_mismatch: {
    error: 'invalid_grant',
    vi: 'redirect_uri không khớp',
    en: 'redirect_uri mismatch',
  },
  client_id_mismatch: {
    error: 'invalid_grant',
    vi: 'client_id không khớp',
    en: 'client_id mismatch',
  },
  unknown_client_id: {
    error: 'invalid_client',
    vi: 'Client không tồn tại',
    en: 'Unknown client_id',
  },
  invalid_client_secret: {
    error: 'invalid_client',
    vi: 'client_secret không hợp lệ',
    en: 'Invalid client_secret',
  },
  pkce_verification_failed: {
    error: 'invalid_grant',
    vi: 'Xác minh PKCE thất bại',
    en: 'PKCE verification failed',
  },
  user_not_found: {
    error: 'invalid_grant',
    vi: 'Người dùng không tồn tại',
    en: 'User not found',
  },
  missing_bearer_token: {
    error: 'invalid_token',
    vi: 'Thiếu Bearer token',
    en: 'Missing Bearer token',
  },
  token_not_found_or_expired: {
    error: 'invalid_token',
    vi: 'Token không tìm thấy hoặc đã hết hạn',
    en: 'Token not found or expired',
  },
  internal_server_error: {
    error: 'server_error',
    vi: 'Lỗi máy chủ nội bộ',
    en: 'Internal server error',
  },
};

export function bilingual(code: ErrorCode): BilingualErrorBody {
  const m = messages[code];
  return {
    error: m.error,
    error_description: m.vi,
    error_i18n: { vi: m.vi, en: m.en },
  };
}
