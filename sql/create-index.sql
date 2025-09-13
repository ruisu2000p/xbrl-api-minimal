-- Create composite index for faster API key lookups
create index if not exists idx_api_keys_prefix_hash 
on public.api_keys(key_prefix, key_hash);