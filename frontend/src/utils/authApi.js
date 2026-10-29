
const API_BASE_URL = '/api';

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error ||
        'Something went wrong. Please try again.'
    );
  }

  return data;
}

export async function requestRegistrationOtp(userData) {
  const response = await fetch(
    `${API_BASE_URL}/auth/register/request-otp`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    }
  );

  return handleResponse(response);
}

export async function verifyRegistrationOtp(data) {
  const response = await fetch(
    `${API_BASE_URL}/auth/register/verify-otp`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  return handleResponse(response);
}

export async function loginUser(credentials) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  return handleResponse(response);
}

// STEP 1: Request password reset OTP
export async function requestPasswordResetOtp(email) {
  const response = await fetch(
    `${API_BASE_URL}/auth/forgot-password/request-otp`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    }
  );

  return handleResponse(response);
}

// STEP 2: Verify password reset OTP
export async function verifyPasswordResetOtp(data) {
  const response = await fetch(
    `${API_BASE_URL}/auth/forgot-password/verify-otp`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  return handleResponse(response);
}

// STEP 3: Reset password after OTP verification
export async function resetPassword(data) {
  const response = await fetch(
    `${API_BASE_URL}/auth/forgot-password/reset`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  return handleResponse(response);
}
