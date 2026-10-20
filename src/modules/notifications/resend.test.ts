import { describe, expect, it } from "vitest";
import type { EmailMessage } from "./index";
import { createResendEmailSender, createResendEmailSenderFromEnv, ResendError } from "./index";

type SentRequest = { url: string; headers: Record<string, string>; json: Record<string, unknown> };

/** A stand-in for Resend's API: records each request and answers with the given status and body. */
function fakeResend(status: number, body: unknown) {
  const sent: SentRequest[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    sent.push({
      url: String(input),
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      json: JSON.parse(String(init?.body)),
    });
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  };
  const sender = createResendEmailSender({ apiKey: "re_test_key", from: "Zeytin Evi <siparis@zeytinevi.test>", fetch });
  return { sender, sent };
}

const MESSAGE: EmailMessage = {
  to: "ayse@example.com",
  subject: "Zeytin Evi: K7M2QX9P numaralı siparişiniz alındı",
  text: "Merhaba Ayşe Yılmaz,",
  html: "<p>Merhaba Ayşe Yılmaz,</p>",
  idempotencyKey: "order-confirmed/K7M2QX9P",
};

describe("Resend e-mail sender", () => {
  it("sends the message from the configured address with the API key", async () => {
    const { sender, sent } = fakeResend(200, { id: "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794" });

    await sender.send(MESSAGE);

    expect(sent).toHaveLength(1);
    expect(sent[0].url).toBe("https://api.resend.com/emails");
    expect(sent[0].headers).toMatchObject({
      authorization: "Bearer re_test_key",
      "content-type": "application/json",
      "idempotency-key": "order-confirmed/K7M2QX9P",
    });
    expect(sent[0].json).toEqual({
      from: "Zeytin Evi <siparis@zeytinevi.test>",
      to: ["ayse@example.com"],
      subject: MESSAGE.subject,
      text: MESSAGE.text,
      html: MESSAGE.html,
    });
  });

  it("sends no idempotency key when the message has none", async () => {
    const { sender, sent } = fakeResend(200, { id: "1" });

    await sender.send({ ...MESSAGE, idempotencyKey: undefined });

    expect(sent[0].headers).not.toHaveProperty("idempotency-key");
  });

  it("rejects with Resend's error when the message is refused", async () => {
    const { sender } = fakeResend(422, {
      statusCode: 422,
      name: "validation_error",
      message: "Invalid `to` field.",
    });

    const sending = sender.send(MESSAGE);

    await expect(sending).rejects.toBeInstanceOf(ResendError);
    await expect(sending).rejects.toThrow("Resend refused the e-mail (422 validation_error): Invalid `to` field.");
  });
});

describe("Resend configuration from the environment", () => {
  it("is off when no variable is set", () => {
    expect(createResendEmailSenderFromEnv({})).toBeUndefined();
  });

  it("is on when every variable is set", () => {
    expect(
      createResendEmailSenderFromEnv({ RESEND_API_KEY: "re_test_key", EMAIL_FROM: "Zeytin Evi <siparis@zeytinevi.test>" }),
    ).toBeDefined();
  });

  it("names the missing variable when only part is set", () => {
    expect(() => createResendEmailSenderFromEnv({ RESEND_API_KEY: "re_test_key" })).toThrow("EMAIL_FROM");
  });
});
