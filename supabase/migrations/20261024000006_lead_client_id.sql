-- /api/lead generates the lead id (crypto.randomUUID) so it can return it for the chat deep link
-- (/messages?lead=<id>). anon still has no SELECT on leads, so nothing can be read back; a
-- client-chosen id only risks a PK conflict for that one insert. Opening the chat still needs a
-- signed-in, confirmed email equal to leads.email (private.my_customer_lead_ids()).
grant insert (id) on public.leads to anon, authenticated;
