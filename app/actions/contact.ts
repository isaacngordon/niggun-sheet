'use server';

export async function submitContact(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const subject = formData.get('subject') as string;
  const message = formData.get('message') as string;

  // Validate
  if (!name || !email || !subject || !message) {
    throw new Error('Missing required fields');
  }

  try {
    // Send to FormSubmit.co
    const response = await fetch('https://formsubmit.co/yehudahyjacobs@gmail.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        name,
        email,
        subject,
        message,
        _subject: `New Message from Niggun Sheet: ${subject}`,
        _captcha: 'false',
      }).toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to submit form');
    }

    return { success: true };
  } catch (error) {
    console.error('Contact form error:', error);
    throw error;
  }
}
