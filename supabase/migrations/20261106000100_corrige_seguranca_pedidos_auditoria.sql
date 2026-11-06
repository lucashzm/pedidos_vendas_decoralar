-- BM Móveis: segurança, auditoria e criação transacional de pedidos
-- Aplicada ao projeto Supabase hpjiwmmslyvuqrkllmvb em 06/11/2026.

alter table public.pedidos
  add column if not exists condicao_cartao text,
  add column if not exists taxa_parcelamento numeric(12,2) not null default 0;

-- Primeiro número de pedido após a limpeza dos registros de teste.
alter table public.pedidos alter column numero_pedido restart with 48327;

drop policy if exists authenticated_can_insert_pedidos on public.pedidos;
create policy authenticated_can_insert_pedidos
on public.pedidos for insert to authenticated
with check (
  exists (
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.id = pedidos.user_id
      and u.ativo is distinct from false
      and (u.cargo = 'administrador' or u.id = pedidos.user_id)
  )
);

drop policy if exists authenticated_can_select_pedidos on public.pedidos;
create policy authenticated_can_select_pedidos
on public.pedidos for select to authenticated
using (
  exists (
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.ativo is distinct from false
      and (u.cargo = 'administrador' or u.id = pedidos.user_id)
  )
);

drop policy if exists authenticated_can_update_pedidos on public.pedidos;
create policy authenticated_can_update_pedidos
on public.pedidos for update to authenticated
using (
  exists (
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.ativo is distinct from false
      and (u.cargo = 'administrador' or u.id = pedidos.user_id)
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.ativo is distinct from false
      and (u.cargo = 'administrador' or u.id = pedidos.user_id)
  )
);

drop policy if exists authenticated_can_insert_pedido_itens on public.pedido_itens;
create policy authenticated_can_insert_pedido_itens
on public.pedido_itens for insert to authenticated
with check (
  exists (
    select 1 from public.pedidos p
    join public.users u on u.auth_user_id = (select auth.uid())
    where p.id = pedido_itens.pedido_id
      and u.ativo is distinct from false
      and (u.cargo = 'administrador' or p.user_id = u.id)
  )
);

drop policy if exists authenticated_can_update_pedido_itens on public.pedido_itens;
create policy authenticated_can_update_pedido_itens
on public.pedido_itens for update to authenticated
using (
  exists (
    select 1 from public.pedidos p
    join public.users u on u.auth_user_id = (select auth.uid())
    where p.id = pedido_itens.pedido_id
      and u.ativo is distinct from false
      and (u.cargo = 'administrador' or p.user_id = u.id)
  )
)
with check (
  exists (
    select 1 from public.pedidos p
    join public.users u on u.auth_user_id = (select auth.uid())
    where p.id = pedido_itens.pedido_id
      and u.ativo is distinct from false
      and (u.cargo = 'administrador' or p.user_id = u.id)
  )
);

drop policy if exists authenticated_can_update_clientes on public.clientes;
create policy authenticated_can_update_clientes
on public.clientes for update to authenticated
using (
  exists (
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.cargo = 'administrador'
      and u.ativo is distinct from false
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.cargo = 'administrador'
      and u.ativo is distinct from false
  )
);

drop policy if exists authenticated_can_select_pedido_status_historico on public.pedido_status_historico;
create policy authenticated_can_select_pedido_status_historico
on public.pedido_status_historico for select to authenticated
using (
  exists (
    select 1 from public.pedidos p
    join public.users u on u.auth_user_id = (select auth.uid())
    where p.id = pedido_status_historico.pedido_id
      and u.ativo is distinct from false
      and (u.cargo = 'administrador' or p.user_id = u.id)
  )
);

drop policy if exists authenticated_can_insert_pedido_status_historico on public.pedido_status_historico;

create or replace function public.registrar_historico_status_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
begin
  select u.id into v_actor
  from public.users u
  where u.auth_user_id = (select auth.uid())
  limit 1;

  if tg_op = 'INSERT' then
    insert into public.pedido_status_historico
      (pedido_id, status_entrega, status_financeiro, alterado_por)
    values
      (new.id, new.status_entrega, new.status_financeiro, v_actor);
    return new;
  end if;

  if new.status_entrega is distinct from old.status_entrega
     or new.status_financeiro is distinct from old.status_financeiro then
    insert into public.pedido_status_historico
      (pedido_id, status_entrega, status_financeiro, alterado_por)
    values
      (new.id, new.status_entrega, new.status_financeiro, v_actor);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_registrar_historico_status_pedido on public.pedidos;
create trigger trg_registrar_historico_status_pedido
after insert or update of status_entrega, status_financeiro
on public.pedidos
for each row execute function public.registrar_historico_status_pedido();

revoke all on function public.registrar_historico_status_pedido() from public, anon, authenticated;
revoke all on function public.proteger_alteracao_pedido_vendedor() from public, anon, authenticated;
revoke execute on function public.consultar_pedido_publico(bigint,text) from public, authenticated;
grant execute on function public.consultar_pedido_publico(bigint,text) to anon;

create or replace function public.criar_pedido_com_itens(p_pedido jsonb, p_itens jsonb)
returns table(id uuid, numero_pedido bigint)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_cargo text;
  v_pedido_id uuid;
  v_numero_pedido bigint;
  v_item jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Sessão não autenticada.';
  end if;

  select u.id, u.cargo into v_user_id, v_cargo
  from public.users u
  where u.auth_user_id = (select auth.uid())
    and u.ativo is distinct from false
  limit 1;

  if v_user_id is null then
    raise exception 'Usuário sem cadastro ativo no painel.';
  end if;

  if jsonb_typeof(p_pedido) <> 'object'
     or jsonb_typeof(p_itens) <> 'array'
     or jsonb_array_length(p_itens) = 0 then
    raise exception 'Dados do pedido ou lista de produtos inválidos.';
  end if;

  insert into public.pedidos (
    cliente_id, cliente_nome, user_id, cliente_cpf_cnpj, endereco,
    referencia, forma_pagamento, condicao_cartao, taxa_parcelamento,
    frete, desconto, previsao_entrega, valor_total, observacoes,
    status_entrega, status_financeiro
  ) values (
    nullif(p_pedido->>'cliente_id','')::uuid,
    p_pedido->>'cliente_nome',
    v_user_id,
    nullif(p_pedido->>'cliente_cpf_cnpj',''),
    coalesce(p_pedido->'endereco', 'null'::jsonb),
    nullif(p_pedido->>'referencia',''),
    p_pedido->>'forma_pagamento',
    nullif(p_pedido->>'condicao_cartao',''),
    coalesce(nullif(p_pedido->>'taxa_parcelamento','')::numeric,0),
    coalesce(nullif(p_pedido->>'frete','')::numeric,0),
    coalesce(nullif(p_pedido->>'desconto','')::numeric,0),
    nullif(p_pedido->>'previsao_entrega','')::date,
    coalesce(nullif(p_pedido->>'valor_total','')::numeric,0),
    nullif(p_pedido->>'observacoes',''),
    coalesce(nullif(p_pedido->>'status_entrega',''),'Pendente'),
    coalesce(nullif(p_pedido->>'status_financeiro',''),'Pendente')
  )
  returning pedidos.id, pedidos.numero_pedido into v_pedido_id, v_numero_pedido;

  for v_item in select value from jsonb_array_elements(p_itens)
  loop
    if coalesce((v_item->>'quantidade')::integer,0) <= 0
       or coalesce((v_item->>'valor_unitario')::numeric,-1) < 0 then
      raise exception 'Quantidade ou preço de produto inválido.';
    end if;

    insert into public.pedido_itens
      (pedido_id, produto, sku, quantidade, valor_unitario)
    values (
      v_pedido_id,
      v_item->>'produto',
      v_item->>'sku',
      (v_item->>'quantidade')::integer,
      (v_item->>'valor_unitario')::numeric
    );
  end loop;

  return query select v_pedido_id, v_numero_pedido;
end;
$$;

revoke all on function public.criar_pedido_com_itens(jsonb,jsonb) from public, anon;
grant execute on function public.criar_pedido_com_itens(jsonb,jsonb) to authenticated;

-- Registra um estado inicial para pedidos antigos que ainda não tinham histórico.
insert into public.pedido_status_historico
  (pedido_id,status_entrega,status_financeiro,alterado_por,created_at)
select p.id,p.status_entrega,p.status_financeiro,p.user_id,p.created_at
from public.pedidos p
where not exists (
  select 1 from public.pedido_status_historico h where h.pedido_id=p.id
);
