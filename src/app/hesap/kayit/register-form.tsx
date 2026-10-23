"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { PasswordInput } from "@/components/password-input";
import { registerAction, type RegisterField, type RegisterState } from "../actions";

/** Keeps everything typed after a failed attempt (React would reset the form) and shows each error next to its own field. */
export function RegisterForm() {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(registerAction, undefined);
  const errors = state?.errors ?? {};

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  function fieldProps(name: RegisterField) {
    const error = errors[name];
    return { "aria-invalid": error ? true : undefined, "aria-describedby": error ? `${name}-error` : undefined };
  }

  function fieldError(name: RegisterField) {
    const error = errors[name];
    return (
      error && (
        <p id={`${name}-error`} className="form-error" role="alert">
          {error}
        </p>
      )
    );
  }

  return (
    <form onSubmit={submit} className="admin-form" noValidate>
      <div className="field">
        <label htmlFor="email">E-posta</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          {...fieldProps("email")}
        />
        {fieldError("email")}
      </div>
      <div className="field">
        <label htmlFor="password">Şifre (en az 8 karakter)</label>
        <PasswordInput
          id="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          {...fieldProps("password")}
        />
        {fieldError("password")}
      </div>
      <div className="field">
        <label htmlFor="passwordConfirm">Şifre (tekrar)</label>
        <PasswordInput
          id="passwordConfirm"
          name="passwordConfirm"
          required
          minLength={8}
          autoComplete="new-password"
          {...fieldProps("passwordConfirm")}
        />
        {fieldError("passwordConfirm")}
      </div>
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Üye olunuyor…" : "Üye ol"}
      </button>
    </form>
  );
}
