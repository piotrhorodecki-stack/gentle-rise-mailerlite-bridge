# Gentle Rise MailerLite Bridge

Small Vercel serverless bridge:

Blotato -> Vercel webhook -> MailerLite -> **Gentle Rise — Free Reset Leads**

## Endpoint

`POST /api/blotato-mailerlite`

Accepted email fields:
- `email`
- `contact.email`
- `data.email`
- `lead.email`
- `user.email`

## Environment variables

- `MAILERLITE_API_TOKEN` — required, store only in Vercel
- `MAILERLITE_GROUP_NAME` — optional, defaults to `Gentle Rise — Free Reset Leads`
- `BLOTATO_WEBHOOK_SECRET` — optional; when set, send it from Blotato as `x-webhook-secret`

Do not commit API keys to this repository.
