interface TaskForgeEmailAction {
  label: string;
  url: string;
}

interface TaskForgeEmailTemplateOptions {
  title: string;
  preview: string;
  paragraphs: string[];
  action: TaskForgeEmailAction;
  footer?: string;
}

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const escapeAttribute = (value: string): string => escapeHtml(value);

export const createTaskForgeEmail = ({
  title,
  preview,
  paragraphs,
  action,
  footer = "If you did not request this, you can safely ignore this email.",
}: TaskForgeEmailTemplateOptions): { html: string; text: string } => {
  const safeTitle = escapeHtml(title);
  const safePreview = escapeHtml(preview);
  const safeParagraphs = paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;color:#4b5563;font-size:16px;line-height:24px;">${escapeHtml(paragraph)}</p>`,
    )
    .join("");
  const safeActionLabel = escapeHtml(action.label);
  const safeActionUrl = escapeAttribute(action.url);
  const safeFooter = escapeHtml(footer);

  return {
    text: `${title}\n\n${paragraphs.join("\n\n")}\n\n${action.label}: ${action.url}\n\n${footer}`,
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;background:#f3f6f4;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safePreview}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f6f4;">
      <tr>
        <td style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" align="center" style="max-width:600px;background:#ffffff;border:1px solid #dbe5df;border-radius:16px;">
            <tr>
              <td style="padding:28px 32px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="width:32px;height:32px;border-radius:9px;background:#14ae5d;color:#ffffff;font-size:19px;font-weight:700;line-height:32px;text-align:center;">T</td>
                    <td style="padding-left:10px;color:#13231a;font-size:20px;font-weight:700;letter-spacing:-0.3px;">TaskForge</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 32px 32px;">
                <h1 style="margin:0 0 16px;color:#13231a;font-size:26px;line-height:34px;letter-spacing:-0.5px;">${safeTitle}</h1>
                ${safeParagraphs}
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
                  <tr>
                    <td style="border-radius:8px;background:#14ae5d;">
                      <a href="${safeActionUrl}" style="display:inline-block;padding:12px 18px;color:#ffffff;font-size:15px;font-weight:700;line-height:20px;text-decoration:none;">${safeActionLabel}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:20px;">If the button does not work, copy and paste this link into your browser:<br /><a href="${safeActionUrl}" style="color:#14834a;word-break:break-all;">${safeActionUrl}</a></p>
              </td>
            </tr>
          </table>
          <p style="max-width:600px;margin:16px auto 0;color:#6b7280;font-size:12px;line-height:18px;text-align:center;">${safeFooter}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
};
