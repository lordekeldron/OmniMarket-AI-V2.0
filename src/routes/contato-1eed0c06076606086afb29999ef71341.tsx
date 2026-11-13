import { Mail } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";

const contactEmail = "brunodiasdemouraprofissional@gmail.com";

export const Route = createFileRoute("/contato-1eed0c06076606086afb29999ef71341")({
  head: () => ({
    meta: [
      { title: "Contato direto" },
      {
        name: "description",
        content: "Entre em contato pelo endereço compartilhado nesta página.",
      },
      { name: "robots", content: "noindex, nofollow, noarchive" },
      { name: "googlebot", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: ContactLinkPage,
});

function ContactLinkPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-16 text-foreground">
      <section className="surface w-full max-w-xl p-7 sm:p-10" aria-labelledby="contact-title">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Mail aria-hidden="true" className="size-5" />
        </div>

        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Contato direto
        </p>
        <h1 id="contact-title" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Vamos conversar.
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">
          Para falar comigo, envie uma mensagem pelo endereço abaixo.
        </p>

        <a
          href={`mailto:${contactEmail}`}
          className="mt-7 inline-flex max-w-full break-words rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-primary transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-base"
        >
          {contactEmail.split("@")[0]}@<wbr />
          {contactEmail.split("@")[1]}
        </a>

        <p className="mt-8 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">
          Esta página não aparece na navegação do site e não deve ser indexada por buscadores. Quem
          tiver este link poderá visualizar o endereço de e-mail.
        </p>
      </section>
    </main>
  );
}
