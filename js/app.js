const CATALOGO_URL = 'https://raw.githubusercontent.com/lucashzm/Catalogo_online_Decoralar/main/produtos.js';
const SUPABASE_URL = 'https://hpjiwmmslyvuqrkllmvb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bx1NzXS3nlgFK-te-Nuk9g_6n0j4htx';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let produtos=[];
let usuarioLogado=null;
let salvandoPedido=false;
let pedidosDoVendedor=[];
let paginaMeusPedidos=0;
const PEDIDOS_POR_PAGINA=10;
const clienteNomeEl=document.getElementById('clienteNome');
const clienteCpfEl=document.getElementById('clienteCpf');
const enderecoIds=['cep','rua','numero','bairro','cidade'];
const lista=[];
let produtoSelecionado=null;

const busca=document.getElementById('buscaProduto');
const resultadoBusca=document.getElementById('resultadoBusca');
const ul=document.getElementById('listaProdutos');
const totalEl=document.getElementById('total');
const freteEl=document.getElementById('frete');
const descontoEl=document.getElementById('desconto');
const pagamentoEl=document.getElementById('pagamento');
const condicaoCartaoCampo=document.getElementById('condicaoCartaoCampo');
const condicaoCartaoEl=document.getElementById('condicaoCartao');
const previsaoEntrega=document.getElementById('previsaoEntrega');
const finalizarEl=document.getElementById('finalizar');

function valorProduto(produto){return Number(String(produto.preco||0).replace('R$','').replace('.','').replace(',','.'))||0;}
const DESCONTO_PIX=0.04;
function arredondarCentavos(valor){return Math.round((Number(valor)||0)*100)/100;}
function descontoPagamento(){
 const cartaoAVista=pagamentoEl.value==='Cartão'&&condicaoCartaoEl.value==='À vista';
 return (pagamentoEl.value==='Pix'||pagamentoEl.value==='Dinheiro'||cartaoAVista)?arredondarCentavos(subtotalProdutos()*DESCONTO_PIX):0;
}
function percentualDescontoPagamento(){
 const cartaoAVista=pagamentoEl.value==='Cartão'&&condicaoCartaoEl.value==='À vista';
 return (pagamentoEl.value==='Pix'||pagamentoEl.value==='Dinheiro'||cartaoAVista)?DESCONTO_PIX:0;
}
function valorUnitarioComDesconto(item){
 return arredondarCentavos(item.valor_unitario*(1-percentualDescontoPagamento()));
}
function valorDescontoTotal(){return arredondarCentavos(valorDesconto()+descontoPagamento());}
function valorCampoPositivo(valor){return Math.abs(Number(String(valor||0).replace('R$','').replace(/\./g,'').replace(',','.')))||0;}
function valorFrete(){return valorCampoPositivo(freteEl.value);}
function valorDesconto(){return valorCampoPositivo(descontoEl.value);}
function formatarBRL(valor){return valor.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
function skuProduto(index){return String(index+1).padStart(4,'0');}
function subtotalProdutos(){return lista.reduce((s,i)=>s+i.valor_unitario*i.quantidade,0);}
function valorTotal(){return Math.max(0,arredondarCentavos(subtotalProdutos()+valorFrete()-valorDescontoTotal()));}
function atualizarTotal(){
 totalEl.textContent=formatarBRL(valorTotal());
 const d=document.getElementById('descontoAutomatico');
 if(d){
  const v=descontoPagamento();
  let texto='';
  if(v>0){
   const forma=pagamentoEl.value==='Pix'?'Pix':pagamentoEl.value==='Dinheiro'?'dinheiro':'cartão';
   texto='Desconto à vista no '+forma+': '+formatarBRL(v);
  }
  d.textContent=texto;
 }
 renderizarLista();
}
function normalizarCpfCnpj(valor){const digitos=String(valor||'').replace(/\D/g,'');return digitos||null;}

// Deixa nomes e endereços padronizados sem transformar tudo em MAIÚSCULAS.
function capitalizarTexto(valor){
 return String(valor||'').toLowerCase().trim().replace(/\s+/g,' ').replace(/(^|[\s-])([a-záàâãéêíóôõúç])/g,(m,esp,letra)=>esp+letra.toUpperCase()).replace(/\b(de|da|do|das|dos|e)\b/g,(m)=>m.toLowerCase()).replace(/^([a-záàâãéêíóôõúç])/,m=>m.toUpperCase());
}

const camposCapitalizados=[
 document.getElementById('clienteNome'),
 document.getElementById('rua'),
 document.getElementById('bairro'),
 document.getElementById('cidade'),
 document.getElementById('referencia'),
 document.getElementById('observacoes')
].filter(Boolean);

camposCapitalizados.forEach(campo=>{
 campo.addEventListener('blur',()=>{campo.value=capitalizarTexto(campo.value);});
});

async function verificarUsuario(){
 const {data:{user}}=await db.auth.getUser();
 if(!user){window.location.href='login.html';return;}
 const {data,error}=await db.from('users').select('*').eq('auth_user_id',user.id).single();
 if(error)throw error;
 usuarioLogado=data;
}

async function logout(){
 await db.auth.signOut();
 window.location.href='login.html';
}

document.getElementById('logout').onclick=logout;

function renderizarLista(){
 ul.innerHTML='';
 lista.forEach((item,index)=>{
  const li=document.createElement('li');
  li.className='item-pedido';
  const valorBase=formatarBRL(item.valor_unitario);
  const valorComDesconto=valorUnitarioComDesconto(item);
  const temDesconto=valorComDesconto<item.valor_unitario;
  li.innerHTML=`<div class="produto-resumo"><strong>${item.sku} - ${item.produto}</strong><span>Quantidade: ${item.quantidade}</span><span>Valor unitário: ${valorBase}${temDesconto?' <strong style="color:#198754">→ '+formatarBRL(valorComDesconto)+'</strong>':''}</span></div><button class="remover-produto" data-index="${index}">X</button>`;
  ul.appendChild(li);
 });
 document.querySelectorAll('.remover-produto').forEach(b=>b.onclick=()=>{lista.splice(Number(b.dataset.index),1);renderizarLista();atualizarTotal();});
}

async function carregarCatalogo(){
 const r=await fetch(CATALOGO_URL);
 if(!r.ok)throw new Error('Não foi possível carregar o catálogo de produtos.');
 const c=await r.text();
 produtos=new Function(c+'\nreturn produtos;')();
}

busca.addEventListener('input',()=>{
 const termo=busca.value.toLowerCase().trim();
 resultadoBusca.innerHTML='';
 if(!termo)return;
 produtos.filter((p,i)=>p.nome.toLowerCase().includes(termo)||skuProduto(i).includes(termo)).slice(0,10).forEach(p=>{
  const i=produtos.indexOf(p);
  const d=document.createElement('div');
  d.textContent=`${skuProduto(i)} - ${p.nome} - ${p.preco||''}`;
  d.onclick=()=>{produtoSelecionado={produto:p,index:i};busca.value=`${skuProduto(i)} - ${p.nome}`;resultadoBusca.innerHTML='';};
  resultadoBusca.appendChild(d);
 });
});

document.getElementById('adicionarProduto').onclick=()=>{
 if(!produtoSelecionado)return;
 lista.push({sku:skuProduto(produtoSelecionado.index),produto:produtoSelecionado.produto.nome,quantidade:Number(document.getElementById('quantidade').value||1),valor_unitario:valorProduto(produtoSelecionado.produto)});
 produtoSelecionado=null;
 busca.value='';
 document.getElementById('quantidade').value=1;
 renderizarLista();
 atualizarTotal();
};

pagamentoEl.addEventListener('change',()=>{
 condicaoCartaoCampo.style.display=pagamentoEl.value==='Cartão'?'flex':'none';
 if(pagamentoEl.value!=='Cartão')condicaoCartaoEl.value='';
 atualizarTotal();
});
condicaoCartaoEl.addEventListener('change',atualizarTotal);
freteEl.addEventListener('input',atualizarTotal);
descontoEl.addEventListener('input',atualizarTotal);

async function salvarPedido(){
 if(salvandoPedido)return;
 salvandoPedido=true;
 finalizarEl.disabled=true;
 const textoOriginalFinalizar=finalizarEl.textContent;
 finalizarEl.textContent='Salvando...';
 try{
  camposCapitalizados.forEach(campo=>{campo.value=capitalizarTexto(campo.value);});
  const cpfCnpj=normalizarCpfCnpj(clienteCpfEl.value);
  clienteCpfEl.value=cpfCnpj||'';
  const cliente={nome:clienteNomeEl.value,cpf_cnpj:cpfCnpj,telefone:document.getElementById('clienteTelefone').value,email:document.getElementById('clienteEmail').value};
  let clienteExistente=null;

  if(cpfCnpj){
    const consulta=await db.from('clientes').select('id,nome').eq('cpf_cnpj',cpfCnpj).maybeSingle();
    if(consulta.error)throw consulta.error;
    clienteExistente=consulta.data;
    if(clienteExistente){
      const nomeInformado=cliente.nome.trim().toLowerCase();
      const nomeCadastrado=String(clienteExistente.nome||'').trim().toLowerCase();
      if(nomeInformado&&nomeCadastrado&&nomeInformado!==nomeCadastrado){
        throw new Error(`CPF/CNPJ já cadastrado para ${clienteExistente.nome}. Confira o CPF/CNPJ ou o nome do cliente.`);
      }
    }
  }

  let clienteId=clienteExistente?.id;
  if(!clienteId){
    const r=await db.from('clientes').insert(cliente).select('id').single();
    if(r.error){
      if(r.error.code==='23505')throw new Error('CPF/CNPJ já cadastrado. Confira os dados do cliente.');
      throw r.error;
    }
    clienteId=r.data.id;
  }

  const pedido={
   cliente_id:clienteId,
   cliente_nome:cliente.nome,
   user_id:usuarioLogado.id,
   cliente_cpf_cnpj:cliente.cpf_cnpj,
   endereco:`${cep.value}, ${rua.value}, ${numero.value}, ${bairro.value}, ${cidade.value}`,
   referencia:referencia.value,
   forma_pagamento:pagamentoEl.value,
   frete:valorFrete(),
   desconto:valorDescontoTotal(),
   previsao_entrega:previsaoEntrega.value,
   valor_total:valorTotal(),
   observacoes:observacoes.value,
   status_entrega:'Pendente',
   status_financeiro:'Pendente'
  };

  const p=await db.from('pedidos').insert(pedido).select('id, numero_pedido').single();
  if(p.error)throw p.error;
  const r=await db.from('pedido_itens').insert(lista.map(i=>({...i,pedido_id:p.data.id})));
  if(r.error)throw r.error;
  await gerarPDF(p.data.id);
  alert(`Pedido ${p.data.numero_pedido} salvo com sucesso!`);
  window.location.reload();
 }catch(e){
  salvandoPedido=false;
  finalizarEl.disabled=false;
  finalizarEl.textContent=textoOriginalFinalizar;
  throw e;
 }
}

document.getElementById('finalizar').onclick=()=>salvarPedido().catch(e=>{console.error(e);alert(e.message||'Erro ao salvar pedido. Veja o console.');});

verificarUsuario().then(()=>carregarCatalogo()).catch(e=>{console.error(e);alert(e.message||'Erro ao inicializar o pedido.');});


// Navegação entre criação de pedido e consulta dos pedidos do vendedor.
document.querySelectorAll('[data-aba]').forEach(botao=>{
 botao.addEventListener('click',()=>{
  document.querySelectorAll('[data-aba]').forEach(b=>b.classList.toggle('ativa',b===botao));
  document.getElementById('novaVendaView').hidden=botao.dataset.aba!=='novaVendaView';
  document.getElementById('meusPedidosView').hidden=botao.dataset.aba!=='meusPedidosView';
  if(botao.dataset.aba==='meusPedidosView'){const caixa=document.getElementById('listaMeusPedidos');if(caixa&&!caixa.dataset.consultado)caixa.innerHTML='<p>Use os filtros e clique em Consultar para buscar seus pedidos.</p>';}
 });
});

function escaparHTML(valor){
 return String(valor??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function dataBR(valor){
 if(!valor)return '—';
 const d=String(valor).slice(0,10).split('-');
 return d.length===3?d[2]+'/'+d[1]+'/'+d[0]:String(valor);
}
function statusBadge(status){
 const cls=String(status||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,'-');
 return '<span class="badge-pedido status-'+escaparHTML(cls)+'">'+escaparHTML(status||'—')+'</span>';
}
async function carregarMeusPedidos(pagina=0){
 const caixa=document.getElementById('listaMeusPedidos');
 caixa.dataset.consultado='true';
 caixa.innerHTML='<p>Consultando pedidos...</p>';
 paginaMeusPedidos=Math.max(0,pagina);
 try{
  if(!usuarioLogado)await verificarUsuario();
  let q=db.from('pedidos').select('id,numero_pedido,cliente_nome,cliente_id,cliente_cpf_cnpj,endereco,referencia,observacoes,forma_pagamento,frete,desconto,valor_total,created_at,previsao_entrega,status_entrega,status_financeiro,pedido_itens(produto,sku,quantidade,valor_unitario),clientes(nome)',{count:'exact'}).eq('user_id',usuarioLogado.id);
  const numero=document.getElementById('filtroNumeroMeusPedidos').value.trim();
  const cpf=normalizarCpfCnpj(document.getElementById('filtroCpfMeusPedidos').value);
  const status=document.getElementById('filtroStatusMeusPedidos').value;
  const inicio=document.getElementById('filtroDataInicialMeusPedidos').value;
  const fim=document.getElementById('filtroDataFinalMeusPedidos').value;
  if(numero&&/^\\d+$/.test(numero))q=q.eq('numero_pedido',Number(numero));
  if(cpf)q=q.ilike('cliente_cpf_cnpj','%'+cpf+'%');
  if(status)q=q.eq('status_entrega',status);
  if(inicio)q=q.gte('created_at',inicio+'T00:00:00');
  if(fim)q=q.lte('created_at',fim+'T23:59:59.999');
  const offset=paginaMeusPedidos*PEDIDOS_POR_PAGINA;
  const {data,error,count}=await q.order('created_at',{ascending:false}).range(offset,offset+PEDIDOS_POR_PAGINA-1);
  if(error)throw error;
  pedidosDoVendedor=data||[];
  renderizarMeusPedidos(count||0);
 }catch(e){console.error('Erro ao consultar meus pedidos:',e);caixa.innerHTML='<p class="erro-pedidos">Não foi possível carregar seus pedidos. Tente novamente.</p>';}
}
function renderizarMeusPedidos(totalPedidos=0){
 const caixa=document.getElementById('listaMeusPedidos');
 if(!pedidosDoVendedor.length){caixa.innerHTML='<p>Nenhum pedido encontrado com esses filtros.</p>';return;}
 caixa.innerHTML=pedidosDoVendedor.map(p=>{
  const nome=p.cliente_nome||p.clientes?.nome||'Cliente';
  const itens=(p.pedido_itens||[]).map(i=>'<li>'+escaparHTML(i.produto)+' × '+escaparHTML(i.quantidade)+'</li>').join('');
  const podeCancelar=p.status_entrega==='Pendente';
  const podeEditar=p.status_entrega==='Pendente';
  return '<article class="pedido-vendedor" data-pedido-card="'+p.id+'">'+
   '<div class="pedido-vendedor-topo"><div><small>PEDIDO</small><h3>#'+escaparHTML(p.numero_pedido)+' · '+escaparHTML(nome)+'</h3><span>Criado em '+dataBR(p.created_at)+'</span></div><strong>'+formatarBRL(p.valor_total)+'</strong></div>'+
   '<div class="pedido-vendedor-status">'+statusBadge(p.status_entrega)+statusBadge(p.status_financeiro)+'</div>'+
   '<details><summary>Ver detalhes do pedido</summary><div class="pedido-vendedor-detalhes">'+
    '<p><strong>Entrega:</strong> '+escaparHTML(p.endereco||'—')+'</p><p><strong>Referência:</strong> '+escaparHTML(p.referencia||'—')+'</p>'+
    '<p><strong>Previsão:</strong> '+dataBR(p.previsao_entrega)+'</p><p><strong>Pagamento:</strong> '+escaparHTML(p.forma_pagamento||'—')+'</p>'+
    '<p><strong>Frete:</strong> '+formatarBRL(p.frete)+' · <strong>Desconto:</strong> '+formatarBRL(p.desconto)+'</p>'+
    '<ul>'+itens+'</ul><p><strong>Observações:</strong> '+escaparHTML(p.observacoes||'—')+'</p></div></details>'+
   '<div class="acoes-pedido-vendedor">'+(podeEditar?'<button type="button" data-editar-pedido="'+p.id+'">Editar nome/endereço</button>':'<span class="aviso-cancelamento">Pedido em movimentação: edição bloqueada.</span>')+
   (podeCancelar?'<button type="button" class="botao-cancelar-pedido" data-cancelar-pedido="'+p.id+'">Cancelar pedido</button>':'')+'</div>'+
   (p.status_entrega!=='Pendente'&&!['Cancelado','Devolvido'].includes(p.status_entrega)?'<small class="aviso-cancelamento">Pedido em andamento: solicite o cancelamento à equipe pelo Painel BM.</small>':'')+
  '</article>';
 }).join('') + '<div class="paginacao-meus-pedidos"><span>Mostrando '+(totalPedidos?paginaMeusPedidos*PEDIDOS_POR_PAGINA+1:0)+'–'+Math.min((paginaMeusPedidos+1)*PEDIDOS_POR_PAGINA,totalPedidos)+' de '+totalPedidos+' pedidos</span><div><button type="button" id="paginaAnteriorMeusPedidos" '+(paginaMeusPedidos===0?'disabled':'')+'>Anterior</button><button type="button" id="paginaProximaMeusPedidos" '+((paginaMeusPedidos+1)*PEDIDOS_POR_PAGINA>=totalPedidos?'disabled':'')+'>Próxima</button></div></div>';
 caixa.innerHTML += '<div class="paginacao-meus-pedidos"><span>Mostrando '+(totalPedidos?paginaMeusPedidos*PEDIDOS_POR_PAGINA+1:0)+'–'+Math.min((paginaMeusPedidos+1)*PEDIDOS_POR_PAGINA,totalPedidos)+' de '+totalPedidos+' pedidos</span><div><button type="button" id="paginaAnteriorMeusPedidos" '+(paginaMeusPedidos===0?'disabled':'')+'>Anterior</button><button type="button" id="paginaProximaMeusPedidos" '+((paginaMeusPedidos+1)*PEDIDOS_POR_PAGINA>=totalPedidos?'disabled':'')+'>Próxima</button></div></div>';

}
async function editarDadosPedido(id){
 const p=pedidosDoVendedor.find(x=>x.id===id);
 if(!p)return;
 if(p.status_entrega!=='Pendente'){alert('Não é possível editar um pedido que já está em movimentação.');return;}
 const nomeAtual=p.cliente_nome||p.clientes?.nome||'';
 const novoNome=prompt('Nome do cliente:',nomeAtual);
 if(novoNome===null)return;
 if(!novoNome.trim()){alert('Informe o nome do cliente.');return;}
 const enderecoAtual=p.endereco||'';
 const novoEndereco=prompt('Endereço completo para entrega:',enderecoAtual);
 if(novoEndereco===null)return;
 if(!novoEndereco.trim()){alert('Informe o endereço de entrega.');return;}
 const {error}=await db.from('pedidos').update({cliente_nome:capitalizarTexto(novoNome),endereco:novoEndereco.trim()}).eq('id',id).eq('user_id',usuarioLogado.id);
 if(error){console.error(error);alert('Não foi possível salvar as alterações.');return;}
 alert('Dados do pedido atualizados.');
 await carregarMeusPedidos();
}
async function cancelarMeuPedido(id){
 const p=pedidosDoVendedor.find(x=>x.id===id);
 if(!p)return;
 if(p.status_entrega!=='Pendente'){alert('Só é possível cancelar diretamente pedidos com status Pendente. Para pedidos em andamento, solicite o cancelamento à equipe pelo Painel BM.');return;}
 const motivo=prompt('Informe o motivo do cancelamento:');
 if(motivo===null)return;
 if(!motivo.trim()){alert('O motivo do cancelamento é obrigatório.');return;}
 const senha=prompt('Digite sua senha para confirmar o cancelamento:');
 if(senha===null)return;
 if(!senha){alert('A senha é obrigatória.');return;}
 const confirmar=confirm('Confirma o cancelamento do pedido #'+p.numero_pedido+'? Esta ação não pode ser desfeita.');
 if(!confirmar)return;
 try{
  const {data:{user},error:userError}=await db.auth.getUser();
  if(userError||!user)throw new Error('Sessão expirada. Entre novamente.');
  const validacao=await db.auth.signInWithPassword({email:user.email,password:senha});
  if(validacao.error)throw new Error('Senha inválida.');
  const nota='\n[Cancelamento pelo vendedor '+new Date().toLocaleString('pt-BR')+'] Motivo: '+motivo.trim();
  const observacoes=(p.observacoes||'')+nota;
  const {error}=await db.from('pedidos').update({status_entrega:'Cancelado',status_financeiro:'Cancelado',observacoes}).eq('id',id).eq('user_id',usuarioLogado.id).eq('status_entrega','Pendente');
  if(error)throw error;
  alert('Pedido cancelado.');
  await carregarMeusPedidos();
 }catch(e){
  console.error('Erro ao cancelar pedido:',e);
  alert(e.message||'Não foi possível cancelar. Atualize a lista e tente novamente.');
 }
}
document.getElementById('atualizarMeusPedidos')?.addEventListener('click',()=>carregarMeusPedidos(0));
document.getElementById('filtroNumeroMeusPedidos')?.addEventListener('keydown',e=>{if(e.key==='Enter')carregarMeusPedidos();});

document.getElementById('listaMeusPedidos')?.addEventListener('click',e=>{
 if(e.target.id==='paginaAnteriorMeusPedidos')carregarMeusPedidos(paginaMeusPedidos-1);
 if(e.target.id==='paginaProximaMeusPedidos')carregarMeusPedidos(paginaMeusPedidos+1);
 const editar=e.target.closest('[data-editar-pedido]');
 const cancelar=e.target.closest('[data-cancelar-pedido]');
 if(editar)editarDadosPedido(editar.dataset.editarPedido);
 if(cancelar)cancelarMeuPedido(cancelar.dataset.cancelarPedido);
});
