import nodemailer from 'nodemailer';
import { config } from '../config';

interface SigningRequestEmailData {
  to: string;
  signerName: string;
  documentTitle: string;
  ownerName: string;
  message?: string;
  subject?: string;
  signingUrl: string;
  fields?: Array<{
    type: string;
    label?: string;
    required: boolean;
  }>;
}

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465,
  auth: {
    user: config.email.user,
    pass: config.email.pass
  }
});

export const sendSigningRequestEmail = async (data: SigningRequestEmailData): Promise<void> => {
  const { to, signerName, documentTitle, ownerName, message, subject, signingUrl, fields } = data;

  console.log('Email data received:', { to, signerName, documentTitle, fields });

  const emailSubject = subject || `Signature Request: ${documentTitle}`;
  
  const fieldsHtml = fields && fields.length > 0 ? `
    <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0;">
      <h3 style="margin: 0 0 10px 0; color: #374151; font-size: 16px;">Fields to Complete:</h3>
      <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
        ${fields.map(field => `
          <li style="margin-bottom: 5px;">
            <strong>${field.label || field.type}</strong> 
            <span style="color: ${field.required ? '#ef4444' : '#6b7280'}; font-size: 12px;">
              (${field.required ? 'Required' : 'Optional'})
            </span>
          </li>
        `).join('')}
      </ul>
    </div>
  ` : '';

  console.log('Fields HTML:', fieldsHtml);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 20px; margin: 20px 0; }
        .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Document Signature Request</h1>
        </div>
        <div class="content">
          <p>Hello ${signerName},</p>
          <p><strong>${ownerName}</strong> has requested your signature on document <strong>"${documentTitle}"</strong>.</p>
          ${message ? `<p><em>${message}</em></p>` : ''}
          ${fieldsHtml}
          <p>Please click the button below to review and sign the document:</p>
          <center>
            <a href="${signingUrl}" class="button">Sign Document</a>
          </center>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all;">${signingUrl}</p>
        </div>
        <div class="footer">
          <p>This is an automated message from Document Signature App.</p>
          <p>If you have any questions, please contact the document owner.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Hello ${signerName},

${ownerName} has requested your signature on document "${documentTitle}".

${message ? `Message: ${message}\n` : ''}
${fields && fields.length > 0 ? `
Fields to Complete:
${fields.map(field => `- ${field.label || field.type} (${field.required ? 'Required' : 'Optional'})`).join('\n')}
` : ''}
Please use the following link to review and sign the document:
${signingUrl}

This is an automated message from Document Signature App.
  `;

  await transporter.sendMail({
    from: config.email.from,
    to,
    subject: emailSubject,
    text: textContent,
    html: htmlContent
  });
};

export const sendCompletionEmail = async (
  to: string,
  documentTitle: string,
  downloadUrl: string
): Promise<void> => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 20px; margin: 20px 0; }
        .button { display: inline-block; background: #10B981; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Document Signing Complete</h1>
        </div>
        <div class="content">
          <p>All parties have successfully signed "${documentTitle}".</p>
          <p>You can download the finalized document here:</p>
          <center>
            <a href="${downloadUrl}" class="button">Download Signed Document</a>
          </center>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: config.email.from,
    to,
    subject: `Signing Complete: ${documentTitle}`,
    html: htmlContent
  });
};

export const sendRejectionEmail = async (
  to: string,
  documentTitle: string,
  signerName: string,
  signerEmail: string,
  rejectReason: string
): Promise<void> => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #EF4444; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 20px; margin: 20px 0; }
        .reason { background: #FEE2E2; padding: 15px; border-left: 4px solid #EF4444; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Signature Request Rejected</h1>
        </div>
        <div class="content">
          <p><strong>${signerName}</strong> (${signerEmail}) has rejected signature request for <strong>"${documentTitle}"</strong>.</p>
          <div class="reason">
            <strong>Reason:</strong>
            <p>${rejectReason}</p>
          </div>
          <p>You may need to create a new signing request or contact the signer directly.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail(to, `Signature Rejected: ${documentTitle}`, htmlContent);
};

// Generic email sending function
export const sendEmail = async (
  to: string,
  subject: string,
  htmlContent: string
): Promise<void> => {
  await transporter.sendMail({
    from: config.email.from,
    to,
    subject,
    html: htmlContent
  });
};
