import { describe, expect, it } from "vitest";
import { createTaskForgeEmail } from "../../../src/services/email-template.service.js";

describe("createTaskForgeEmail", () => {
  it("renders TaskForge branding, a CTA, fallback link, and plain-text alternative", () => {
    const email = createTaskForgeEmail({
      title: "Join <Engineering>",
      preview: "You have an invitation.",
      paragraphs: ["Hello & welcome."],
      action: {
        label: "Accept invitation",
        url: "https://taskforge.example/invitations/accept?token=abc&source=email",
      },
    });

    expect(email.html).toContain("TaskForge");
    expect(email.html).toContain("Join &lt;Engineering&gt;");
    expect(email.html).toContain("Hello &amp; welcome.");
    expect(email.html).toContain("Accept invitation");
    expect(email.html).toContain(
      "https://taskforge.example/invitations/accept?token=abc&amp;source=email",
    );
    expect(email.text).toContain(
      "Accept invitation: https://taskforge.example/invitations/accept?token=abc&source=email",
    );
  });
});
