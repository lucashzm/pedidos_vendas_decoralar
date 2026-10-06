const CATALOGO_URL = 'https://raw.githubusercontent.com/lucashzm/Catalogo_online_Decoralar/main/produtos.js';
const SUPABASE_URL = 'https://hpjiwmmslyvuqrkllmvb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bx1NzXS3nlgFK-te-Nuk9g_6n0j4htx';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let produtos=[];
let usuarioLogado=null;
let salvandoPedido=false;
const lista=[];
let produtoSelecionado=null;

const busca=document.getElementById('buscaProduto');
const resultadoBusca=document.getElementById('resultadoBusca');
const ul=document.getElementById('listaProdutos');
const totalEl=document.getElementById('total');
const freteEl=document.getElementById('frete');
const descontoEl=document.getElementById('desconto');
const pagamentoEl=document.getElementById('pagamento');
const previsaoEntrega=document.getElementById('previsaoEntrega');
const finalizarEl=document.getElementById('finalizar');

function valorProduto(produto){return Number(String(produto.preco||0).replace('R$','').replace('.','').replace(',','.'))||0;}
const DESCONTO_PIX=0.04;
function arredondarCentavos(valor){return Math.round((Number(valor)||0)*100)/100;}
function descontoPagamento(){return pagamentoEl.value==='Pix'?arredondarCentavos(subtotalProdutos()*DESCONTO_PIX):0;}
function valorDescontoTotal(){return arredondarCentavos(valorDesconto()+descontoPagamento());}
function valorCampoPositivo(valor){return Math.abs(Number(String(valor||0).replace('R$','').replace(/\./g,'').replace(',','.')))||0;}
function valorFrete(){return valorCampoPositivo(freteEl.value);}
function valorDesconto(){return valorCampoPositivo(descontoEl.value);}
function formatarBRL(valor){return valor.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
function skuProduto(index){return String(index+1).padStart(4,'0');}
function subtotalProdutos(){return lista.reduce((s,i)=>s+i.valor_unitario*i.quantidade,0);}
function valorTotal(){return Math.max(0,arredondarCentavos(subtotalProdutos()+valorFrete()-valorDescontoTotal()));}
function atualizarTotal(){totalEl.textContent=formatarBRL(valorTotal());const d=document.getElementById('descontoAutomatico');if(d){const v=descontoPagamento();d.textContent=v>0?'Desconto à vista no Pix: '+formatarBRL(v):'';}}
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
 lista.forEach((item,index)=>{const li=document.createElement('li');li.className='item-pedido';li.innerHTML=`<div class="produto-resumo"><strong>${item.sku} - ${item.produto}</strong><span>Quantidade: ${item.quantidade}</span><span>Valor unitário: ${formatarBRL(item.valor_unitario)}</span></div><button class="remover-produto" data-index="${index}">X</button>`;ul.appendChild(li);});
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

pagamentoEl.addEventListener('change',atualizarTotal);
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
  const cpfCnpj=normalizarCpfCnpj(clienteCpf.value);
  clienteCpf.value=cpfCnpj||'';
  const cliente={nome:clienteNome.value,cpf_cnpj:cpfCnpj,telefone:clienteTelefone.value,email:clienteEmail.value};
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
   user_id:usuarioLogado.id,
   cliente_cpf_cnpj:cliente.cpf_cnpj,
   endereco:`${cep.value}, ${rua.value}, ${numero.value}, ${bairro.value}, ${cidade.value}`,
   referencia:referencia.value,
   forma_pagamento:pagamento.value,
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
