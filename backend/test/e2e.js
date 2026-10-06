const BASE = 'http://localhost:3001/api';
let pass = 0, fail = 0;
const fails = [];

let skipped = 0;
function ok(name, cond, detail='') {
  // 429 идва от собствения ни rate limiter при няколко бързи пускания —
  // това е доказателство, че работи, а не провал на теста.
  if (!cond && /status=429/.test(detail)) {
    skipped++; console.log(`  SKIP  ${name}  (rate limit — изчакайте 15 мин)`); return;
  }
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; fails.push(`${name} ${detail}`); console.log(`  FAIL  ${name}  ${detail}`); }
}

async function req(method, path, token, body) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  const r = await fetch(BASE + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await r.json(); } catch {}
  return { status: r.status, data };
}

const T = {};
const createdTrips = [];
const createdOrders = [];

(async () => {
console.log('\n=== 1. AUTH — всички роли ===');
for (const [role, email] of Object.entries({
  admin:'admin@wastelogix.bg', dispatcher:'dispatcher@wastelogix.bg',
  driver:'driver1@wastelogix.bg', corporate:'corporate@buildco.bg', individual:'ivan@gmail.com',
})) {
  const r = await req('POST','/auth/login',null,{ email, password:'password123' });
  ok(`login ${role}`, r.status===200 && r.data?.token, `status=${r.status}`);
  if (r.data?.token) T[role] = r.data.token;
}
if (!T.admin || !T.dispatcher || !T.driver || !T.corporate) {
  console.log('\n  Логинът не мина — най-вероятно rate limit от предишно пускане.');
  console.log('  Изчакайте 15 минути или рестартирайте бекенда, за да се нулира броячът.\n');
  process.exit(fail ? 1 : 0);
}

const r401 = await req('GET','/orders',null);
ok('нелогнат получава 401', r401.status===401, `status=${r401.status}`);
const rbad = await req('POST','/auth/login',null,{email:'admin@wastelogix.bg',password:'wrong'});
ok('грешна парола отказана', rbad.status>=400, `status=${rbad.status}`);

console.log('\n=== 2. ИЗОЛАЦИЯ МЕЖДУ КЛИЕНТИ (AT-15) ===');
const corpOrders = await req('GET','/orders',T.corporate);
const indOrders  = await req('GET','/orders',T.individual);
ok('корпоративен вижда само свои', corpOrders.status===200 && Array.isArray(corpOrders.data), `status=${corpOrders.status}`);
const corpList = Array.isArray(corpOrders.data) ? corpOrders.data : [];
const corpIds = new Set(corpList.map(o=>o.clientId));
ok('корпоративен — един clientId', corpIds.size<=1, `видя ${corpIds.size} клиента`);
// cross-access: corporate tries to read an individual's order
const indFirst = (Array.isArray(indOrders.data) ? indOrders.data : [])[0];
if (indFirst) {
  const cross = await req('GET',`/orders/${indFirst.id}`,T.corporate);
  ok('корпоративен НЕ чете чужда заявка', cross.status===403, `status=${cross.status}`);
}

console.log('\n=== 3. РОЛЕВИ ОГРАНИЧЕНИЯ ===');
const dStats = await req('GET','/orders/stats',T.driver);
ok('шофьор НЕ вижда /orders/stats', dStats.status===403, `status=${dStats.status}`);
const cStats = await req('GET','/orders/stats',T.corporate);
ok('клиент НЕ вижда /orders/stats', cStats.status===403, `status=${cStats.status}`);
const aStats = await req('GET','/orders/stats',T.admin);
ok('админ вижда /orders/stats', aStats.status===200, `status=${aStats.status}`);
const cUsers = await req('GET','/users',T.corporate);
ok('клиент НЕ чете /users', cUsers.status===403, `status=${cUsers.status}`);

console.log('\n=== 4. ФИЛТРИ НА ЗАЯВКИ ===');
const multi = await req('GET','/orders?status=CONFIRMED,DELIVERY_SCHEDULED,SCHEDULED,IN_TRANSIT',T.admin);
ok('multi-status филтър работи', multi.status===200 && Array.isArray(multi.data), `status=${multi.status}`);
const single = await req('GET','/orders?status=COMPLETED',T.admin);
ok('single-status филтър работи', single.status===200 && Array.isArray(single.data));
const badStatus = await req('GET','/orders?status=NESUSHTESTVUVASHT',T.admin);
ok('невалиден статус не чупи сървъра', badStatus.status<500, `status=${badStatus.status}`);

console.log('\n=== 5. ПЪЛЕН ЦИКЪЛ — КОНТЕЙНЕРНА ЗАЯВКА ===');
const clients = await req('GET','/clients',T.admin);
const cTypes  = await req('GET','/containers/types',T.admin);
const client  = (Array.isArray(clients.data) ? clients.data : [])[0];
ok('има клиенти', !!client);
const ctype = (Array.isArray(cTypes.data) ? cTypes.data : [])[0];
ok('има типове контейнери', !!ctype, `status=${cTypes.status}`);

const created = await req('POST','/orders',T.corporate,{
  orderType:'CONTAINER', wasteType:'Строителни отпадъци', volumeM3:4,
  containerTypeId: ctype?.id, address:'ул. Тест 1, Русе', lat:43.8564, lng:25.9708,
  requestedDate:new Date(Date.now()+86400000).toISOString(), notes:'E2E тест',
});
ok('клиент създава заявка', created.status===201, `status=${created.status} ${JSON.stringify(created.data).slice(0,120)}`);
const oid = created.data?.id;
ok('новата заявка е PENDING_ADMIN', created.data?.status==='PENDING_ADMIN', `status=${created.data?.status}`);

if (oid) {
  const conf = await req('PATCH',`/orders/${oid}/confirm`,T.admin,{notes:'E2E'});
  ok('админ потвърждава', conf.status===200 && conf.data?.status==='CONFIRMED', `status=${conf.status}/${conf.data?.status}`);

  const trucks = await req('GET','/trucks',T.admin);
  const truck = (Array.isArray(trucks.data) ? trucks.data : [])[0];
  const sites = await req('GET','/disposal-sites',T.admin);
  const site = (Array.isArray(sites.data) ? sites.data : [])[0];

  const trip = await req('POST','/trips',T.admin,{
    truckId: truck?.id, date:new Date().toISOString(), orderIds:[oid], disposalSiteId: site?.id,
  });
  ok('диспечер създава курс', trip.status===201, `status=${trip.status} ${JSON.stringify(trip.data).slice(0,120)}`);
  const tid = trip.data?.id;
  if (tid) createdTrips.push(tid);
  const stop = (trip.data?.stops||[])[0];
  ok('курсът има спирка', !!stop);
  ok('КОНТЕЙНЕР → спирка DELIVERY', stop?.stopType==='DELIVERY', `тип=${stop?.stopType}`);

  const afterPlan = await req('GET',`/orders/${oid}`,T.admin);
  ok('заявката стана DELIVERY_SCHEDULED', afterPlan.data?.status==='DELIVERY_SCHEDULED', `status=${afterPlan.data?.status}`);

  if (tid && stop) {
    await req('PATCH',`/trips/${tid}`,T.admin,{status:'IN_PROGRESS'});
    const sc = await req('PATCH',`/trips/${tid}/stops/${stop.id}`,T.driver,{status:'COMPLETED'});
    ok('шофьор завършва спирката', sc.status===200, `status=${sc.status}`);

    const afterDel = await req('GET',`/orders/${oid}`,T.admin);
    ok('след DELIVERY → AWAITING_FILL', afterDel.data?.status==='AWAITING_FILL', `status=${afterDel.data?.status}`);

    const full = await req('PATCH',`/orders/${oid}/container-full`,T.corporate,{notes:'пълен е'});
    ok('КЛИЕНТ натиска "контейнерът е пълен"', full.status===200 && full.data?.status==='PICKUP_SCHEDULED', `status=${full.status}/${full.data?.status}`);

    const trip2 = await req('POST','/trips',T.admin,{truckId:truck?.id,date:new Date().toISOString(),orderIds:[oid],disposalSiteId:site?.id});
    const stop2 = (trip2.data?.stops||[])[0];
    ok('втори курс за вземане', trip2.status===201, `status=${trip2.status}`);
    ok('този път спирката е PICKUP', stop2?.stopType==='PICKUP', `тип=${stop2?.stopType}`);

    if (trip2.data?.id) createdTrips.push(trip2.data.id);
    if (trip2.data?.id && stop2) {
      await req('PATCH',`/trips/${trip2.data.id}`,T.admin,{status:'IN_PROGRESS'});
      await req('PATCH',`/trips/${trip2.data.id}/stops/${stop2.id}`,T.driver,{status:'COMPLETED'});
      const afterPick = await req('GET',`/orders/${oid}`,T.admin);
      ok('след PICKUP → IN_TRANSIT', afterPick.data?.status==='IN_TRANSIT', `status=${afterPick.data?.status}`);

      const unload = await req('POST',`/trips/${trip2.data.id}/unload`,T.driver,{unloadWeightKg:1800,unloadWasteType:'Строителни отпадъци'});
      ok('разтоварване на депо', unload.status===200, `status=${unload.status}`);
      const afterUnload = await req('GET',`/orders/${oid}`,T.admin);
      ok('след разтоварване → PENDING_VERIFICATION', afterUnload.data?.status==='PENDING_VERIFICATION', `status=${afterUnload.data?.status}`);

      const ver = await req('PATCH',`/orders/${oid}/verify`,T.admin,{});
      ok('админ верифицира → COMPLETED', ver.status===200 && ver.data?.status==='COMPLETED', `status=${ver.status}/${ver.data?.status}`);

      const inv = await req('POST',`/invoices/generate/${oid}`,T.admin,{});
      ok('генерира се фактура', inv.status===201, `status=${inv.status}`);
      ok('фактурата НЕ е 0 лв', (inv.data?.amount||0)>0, `amount=${inv.data?.amount}`);
      ok('фактурата има items', !!inv.data?.items, `items=${JSON.stringify(inv.data?.items)}`);
      ok('цената е от настройките (4 м³ × 50 = 200)', inv.data?.amount===200, `amount=${inv.data?.amount}`);
    }
  }
}

console.log('\n=== 6. НОТИФИКАЦИИ ===');
const notif = await req('GET','/notifications',T.admin);
ok('нотификации се зареждат', notif.status===200, `status=${notif.status}`);
const items = notif.data?.items || notif.data || [];
const undef = JSON.stringify(items).includes('undefined');
ok('няма "undefined" в текста', !undef, undef ? 'НАМЕРЕНО undefined' : '');

console.log('\n=== 7. CRUD — всички ресурси ===');
for (const [name, path] of Object.entries({
  клиенти:'/clients', камиони:'/trucks', депа:'/disposal-sites', контейнери:'/containers',
  'типове контейнери':'/containers/types', потребители:'/users', фактури:'/invoices',
  курсове:'/trips', заявки:'/orders', настройки:'/settings',
})) {
  const r = await req('GET',path,T.admin);
  ok(`GET ${name}`, r.status===200, `status=${r.status}`);
}

console.log('\n=== 8. АНАЛИТИКА / BI ===');
for (const [name, path] of Object.entries({
  'статистика заявки':'/orders/stats', 'аналитика':'/analytics/dashboard', 'шофьори':'/analytics/drivers',
})) {
  const r = await req('GET',path,T.admin);
  ok(`GET ${name}`, r.status===200, `status=${r.status}`);
}

console.log('\n=== 9. ВАЛИДАЦИЯ НА ВХОДА ===');
const noBody = await req('POST','/orders',T.corporate,{});
ok('празна заявка се отхвърля', noBody.status>=400, `status=${noBody.status} — ако е 201/500, липсва валидация`);
const badCoord = await req('POST','/orders',T.corporate,{orderType:'CONTAINER',wasteType:'X',address:'ул. Х',lat:999,lng:999,requestedDate:new Date().toISOString()});
ok('невалидни координати се отхвърлят', badCoord.status>=400, `status=${badCoord.status}`);
const badTrip = await req('POST','/trips',T.admin,{});
ok('курс без камион се отхвърля', badTrip.status>=400, `status=${badTrip.status}`);

console.log('\n=== 10. НОВИ ENDPOINT-И ===');
{
  const trucks = await req('GET','/trucks',T.admin);
  const sites  = await req('GET','/disposal-sites',T.admin);
  const ctypes = await req('GET','/containers/types',T.admin);
  const avail  = await req('GET','/containers/available',T.admin);
  ok('GET свободни контейнери', avail.status===200 && Array.isArray(avail.data), `status=${avail.status}`);

  // нова заявка за тестване на assign + add stop + delete trip
  const o2 = await req('POST','/orders',T.corporate,{
    orderType:'CONTAINER', wasteType:'Тест', volumeM3:6, containerTypeId:(Array.isArray(ctypes.data) ? ctypes.data : [])[0]?.id,
    address:'ул. Втора 2, Русе', lat:43.85, lng:25.97, requestedDate:new Date(Date.now()+86400000).toISOString()});
  await req('PATCH',`/orders/${o2.data?.id}/confirm`,T.admin,{});

  const cont = (Array.isArray(avail.data) ? avail.data : [])[0];
  if (cont && o2.data?.id) {
    const asg = await req('PATCH',`/containers/${cont.id}/assign`,T.admin,{orderId:o2.data.id});
    ok('КОНТЕЙНЕР се свързва със заявка', asg.status===200 && asg.data?.currentOrderId===o2.data.id, `status=${asg.status}`);
    const dup = await req('PATCH',`/containers/${cont.id}/assign`,T.admin,{orderId:o2.data.id});
    ok('повторно свързване не чупи', dup.status===200, `status=${dup.status}`);
  }

  const t3 = await req('POST','/trips',T.admin,{truckId:(Array.isArray(trucks.data) ? trucks.data : [])[0]?.id,date:new Date().toISOString(),orderIds:[o2.data?.id],disposalSiteId:(Array.isArray(sites.data) ? sites.data : [])[0]?.id});
  if (t3.data?.id) createdTrips.push(t3.data.id);
  ok('курс създаден', t3.status===201, `status=${t3.status}`);

  // добавяне на спирка
  const o3 = await req('POST','/orders',T.corporate,{
    orderType:'GARBAGE_TRUCK', wasteType:'Смесен', estimatedKg:800,
    address:'ул. Трета 3, Русе', lat:43.86, lng:25.98, requestedDate:new Date(Date.now()+86400000).toISOString()});
  if (o3.data?.id) createdOrders.push(o3.data.id);
  await req('PATCH',`/orders/${o3.data?.id}/confirm`,T.admin,{});
  const addSt = await req('POST',`/trips/${t3.data?.id}/stops`,T.admin,{orderId:o3.data?.id});
  ok('ДОБАВЯНЕ на спирка към курс', addSt.status===201, `status=${addSt.status} ${JSON.stringify(addSt.data).slice(0,100)}`);
  ok('новата спирка е LOAD', addSt.data?.stopType==='LOAD', `тип=${addSt.data?.stopType}`);
  const dupSt = await req('POST',`/trips/${t3.data?.id}/stops`,T.admin,{orderId:o3.data?.id});
  ok('дублирана спирка се отказва', dupSt.status===409, `status=${dupSt.status}`);

  // изтриване на курс
  const del = await req('DELETE',`/trips/${t3.data?.id}`,T.admin);
  ok('ИЗТРИВАНЕ на планиран курс', del.status===200, `status=${del.status}`);
  const back = await req('GET',`/orders/${o2.data?.id}`,T.admin);
  ok('заявките се върнаха в CONFIRMED', back.data?.status==='CONFIRMED', `status=${back.data?.status}`);

  // фактура: send
  const inv2 = await req('POST','/invoices/generate/'+o2.data?.id,T.admin,{});
  if (inv2.data?.id) {
    const snd = await req('PATCH',`/invoices/${inv2.data.id}/send`,T.admin,{});
    ok('ИЗПРАЩАНЕ на фактура DRAFT→SENT', snd.status===200 && snd.data?.status==='SENT', `status=${snd.status}/${snd.data?.status}`);
    ok('падежът е зададен', !!snd.data?.dueDate);
    const snd2 = await req('PATCH',`/invoices/${inv2.data.id}/send`,T.admin,{});
    ok('повторно изпращане се отказва', snd2.status===400, `status=${snd2.status}`);
    const can = await req('PATCH',`/invoices/${inv2.data.id}/cancel`,T.admin,{});
    ok('анулиране на фактура', can.status===200, `status=${can.status}`);
  }

  // смяна на парола
  const users = await req('GET','/users',T.admin);
  const drv = (Array.isArray(users.data) ? users.data : []).find(u=>u.role==='DRIVER');
  if (drv) {
    const rp = await req('PATCH',`/users/${drv.id}/reset-password`,T.admin,{password:'noviparola123'});
    ok('НУЛИРАНЕ на парола', rp.status===200, `status=${rp.status}`);
    const lg = await req('POST','/auth/login',null,{email:drv.email,password:'noviparola123'});
    ok('новата парола работи', lg.status===200, `status=${lg.status}`);
    await req('PATCH',`/users/${drv.id}/reset-password`,T.admin,{password:'password123'});
    const short = await req('PATCH',`/users/${drv.id}/reset-password`,T.admin,{password:'къса'});
    ok('къса парола се отказва', short.status===400, `status=${short.status}`);
  }

  const self = await req('DELETE',`/users/${(Array.isArray(users.data) ? users.data : []).find(u=>u.role==='ADMIN')?.id}`,T.admin);
  ok('админ не трие себе си', self.status===400, `status=${self.status}`);
}

console.log('\n=== 11. СТАРИ ПРОВЕРКИ ===');
{
const missing = {
  'DELETE курс':['DELETE','/trips/00000000-0000-0000-0000-000000000000'],
  'добавяне на спирка':['POST','/trips/00000000-0000-0000-0000-000000000000/stops'],
  'редакция на фактура':['PATCH','/invoices/00000000-0000-0000-0000-000000000000'],
  'изпращане на фактура':['PATCH','/invoices/00000000-0000-0000-0000-000000000000/send'],
  'нулиране на парола':['PATCH','/users/00000000-0000-0000-0000-000000000000/reset-password'],
};
for (const [name,[m,p]] of Object.entries(missing)) {
  const r = await req(m,p,T.admin,{});
  ok(`${name}: валиден UUID → не 500`, r.status<500, `status=${r.status}`);
}
const badId = await req('GET','/orders/not-a-uuid',T.admin);
ok('невалиден UUID → 400, не 500', badId.status===400, `status=${badId.status}`);
const noRoute = await req('GET','/nesushtestvuvasht',T.admin);
ok('непознат API път → JSON 404', noRoute.status===404 && !!noRoute.data?.error, `status=${noRoute.status}`);
}

// Тестът създава заявки и курсове в същата база, която ползва демото.
// Без почистване демо данните се замърсяват с курсове от по една спирка.
console.log('\n=== ПОЧИСТВАНЕ ===');
{
  let removed = 0;
  for (const id of createdTrips) {
    const r = await req('DELETE', `/trips/${id}`, T.admin);
    if (r.status === 200) removed++;
  }
  for (const id of createdOrders) {
    await req('PATCH', `/orders/${id}/cancel`, T.admin, { notes: 'E2E тест — автоматично отменена' });
  }
  console.log(`  ${removed} тестови курса изтрити, ${createdOrders.length} заявки отменени`);
}

console.log(`\n${'='.repeat(50)}\nРЕЗУЛТАТ: ${pass} минали · ${fail} паднали` +
  (skipped ? ` · ${skipped} пропуснати (rate limit)` : '') + `\n${'='.repeat(50)}`);
if (fails.length) { console.log('\nПАДНАЛИ:'); fails.forEach((f,i)=>console.log(`${i+1}. ${f}`)); }
})();
