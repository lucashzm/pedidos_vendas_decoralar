const CATALOGO_URL = 'https://raw.githubusercontent.com/lucashzm/Catalogo_online_Decoralar/main/produtos.js';
const SUPABASE_URL = 'https://hpjiwmmslyvuqrkllmvb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bx1NzXS3nlgFK-te-Nuk9g_6n0j4htx';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let produtos=[];
let usuarioLogado=null;
const lista=[];
let produtoSelecionado=null;

const busca=document.getElementById('buscaProduto');
const resultadoBusca=document.getElementById('resultadoBusca');
const ul=document.getElementById('listaProdutos');
const totalEl=document.getElementById('total');
const freteEl=document.getElementById('frete');
const previsaoEntrega=document.getElementById('previsaoEntrega');

function valorProduto(produto){return Number(String(produto.preco||0).replace('R$','').replace('.','').replace(',','.'))||0;}
function valorFrete(){return Number(String(freteEl.value||0).replace('R$','').replace('.','').replace(',','.'))||0;}
function formatarBRL(valor){return valor.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
function skuProduto(index){return String(index+1).padStart(4,'0');}
function valorTotal(){return lista.reduce((s,i)=>s+i.valor_unitario*i.quantidade,0)+valorFrete();}
function atualizarTotal(){totalEl.textContent=formatarBRL(valorTotal());}

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

async function carregarCatalogo(){const r=await fetch(CATALOGO_URL);const c=await r.text();produtos=new Function(c+'\nreturn produtos;')();}

busca.addEventListener('input',()=>{const termo=busca.value.toLowerCase().trim();resultadoBusca.innerHTML='';if(!termo)return;produtos.filter((p,i)=>p.nome.toLowerCase().includes(termo)||skuProduto(i).includes(termo)).slice(0,10).forEach(p=>{const i=produtos.indexOf(p);const d=document.createElement('div');d.textContent=`${skuProduto(i)} - ${p.nome} - ${p.preco||''}`;d.onclick=()=>{produtoSelecionado={produto:p,index:i};busca.value=`${skuProduto(i)} - ${p.nome}`;resultadoBusca.innerHTML='';};resultadoBusca.appendChild(d);});});

document.getElementById('adicionarProduto').onclick=()=>{if(!produtoSelecionado)return;lista.push({sku:skuProduto(produtoSelecionado.index),produto:produtoSelecionado.produto.nome,quantidade:Number(document.getElementById('quantidade').value||1),valor_unitario:valorProduto(produtoSelecionado.produto)});produtoSelecionado=null;busca.value='';document.getElementById('quantidade').value=1;renderizarLista();atualizarTotal();};

freteEl.addEventListener('input',atualizarTotal);

async function salvarPedido(){
 const cliente={nome:clienteNome.value,cpf_cnpj:clienteCpf.value||null,telefone:clienteTelefone.value,email:clienteEmail.value};
 let {data:clienteExistente}=await db.from('clientes').select('id').eq('cpf_cnpj',cliente.cpf_cnpj).maybeSingle();
 let clienteId=clienteExistente?.id;
 if(!clienteId){const r=await db.from('clientes').insert(cliente).select('id').single();if(r.error)throw r.error;clienteId=r.data.id;}
 
const pedido={
 cliente_id:clienteId,
 user_id:usuarioLogado.id,
 cliente_cpf_cnpj:cliente.cpf_cnpj,
 endereco:`${cep.value}, ${rua.value}, ${numero.value}, ${bairro.value}, ${cidade.value}`,
 referencia:referencia.value,
 forma_pagamento:pagamento.value,
 frete:valorFrete(),
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
}

document.getElementById('finalizar').onclick=()=>salvarPedido().catch(e=>{console.error(e);alert('Erro ao salvar pedido. Veja o console.');});

verificarUsuario().then(()=>{carregarCatalogo();}).catch(e=>{console.error(e);alert('Erro ao validar usuário.');});
