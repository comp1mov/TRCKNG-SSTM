-- Synthetic fixtures only. Every fixture and mutation is rolled back.
begin;
insert into auth.users(id, aud, role, email) values
 ('c271d630-b56c-4190-b134-b0346ded1a01', 'authenticated', 'authenticated', 'sstm-v2-a@example.invalid'),
 ('c271d630-b56c-4190-b134-b0346ded1a02', 'authenticated', 'authenticated', 'sstm-v2-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','c271d630-b56c-4190-b134-b0346ded1a01',true);
do $$
declare r bigint; n integer; s jsonb := '{"dataset":"sstm-v2","dataVersion":1,"fixture":true}';
begin
 select revision into r from public.commit_trckng_v2(0,s,'fixture','d271d630-b56c-4190-b134-b0346ded1a01','{"fixture":"source"}');
 if r <> 1 then raise exception 'Initial revision failed'; end if;
 select revision into r from public.commit_trckng_v2(0,s,'fixture','d271d630-b56c-4190-b134-b0346ded1a01');
 if r <> 1 then raise exception 'Idempotent retry failed'; end if;
 s := '{"dataset":"sstm-v2","dataVersion":2,"moduleJournal":{"version":1,"tracks":[],"bindings":[]},"fixture":true}';
 select revision into r from public.commit_trckng_v2(1,s,'fixture','d271d630-b56c-4190-b134-b0346ded1a02');
 if r <> 2 then raise exception 'Revision update failed'; end if;
 begin
  perform public.commit_trckng_v2(1,s,'fixture','d271d630-b56c-4190-b134-b0346ded1a03');
  raise exception 'Stale writer was accepted';
 exception when serialization_failure then null; end;
 begin
  update public.trckng_v2_snapshots set source_state='{}';
  raise exception 'Source backup was mutable';
 exception when insufficient_privilege then null; end;
 select count(*) into n from public.trckng_v2_snapshots where user_id=auth.uid() and revision=2 and source_state->>'fixture'='source';
 if n <> 1 then raise exception 'Owner read or backup failed'; end if;
 begin
  perform public.commit_trckng_v2(2,'{"dataset":"sstm-v2","dataVersion":99}','fixture',gen_random_uuid());
  raise exception 'Unknown format accepted';
 exception when check_violation then null; end;
 begin
  perform public.commit_trckng_v2(2,'{"dataset":"wrong","dataVersion":2}','fixture',gen_random_uuid());
  raise exception 'Wrong dataset accepted';
 exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub','c271d630-b56c-4190-b134-b0346ded1a02',true);
do $$
declare n integer;
begin
 select count(*) into n from public.trckng_v2_snapshots where user_id='c271d630-b56c-4190-b134-b0346ded1a01';
 if n <> 0 then raise exception 'Cross-user read allowed'; end if;
 update public.trckng_v2_snapshots set revision=99 where user_id='c271d630-b56c-4190-b134-b0346ded1a01';
 get diagnostics n = row_count;
 if n <> 0 then raise exception 'Cross-user write allowed'; end if;
 begin
  insert into public.trckng_v2_snapshots(user_id,revision,app_state,device_id,write_id) values('c271d630-b56c-4190-b134-b0346ded1a01',1,'{"dataset":"sstm-v2","dataVersion":1}','fixture',gen_random_uuid());
  raise exception 'Cross-user insert allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$
begin
 begin
  perform 1 from public.trckng_v2_snapshots;
  raise exception 'Anonymous read allowed';
 exception when insufficient_privilege then null; end;
 begin
  perform public.commit_trckng_v2(0,'{}','fixture',gen_random_uuid());
  raise exception 'Anonymous write allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: formats 1 and 2, invalid format denied, owner access, immutable backup, revisions, retry, conflict, cross-user denial, anonymous denial; fixtures rolled back' as result;
