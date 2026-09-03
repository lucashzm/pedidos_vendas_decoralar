const CATALOGO_URL = 'https://raw.githubusercontent.com/lucashzm/Catalogo_online_Decoralar/main/produtos.js';

let produtos = [];
const lista = [];
let produtoSelecionado = null;

const busca = document.getElementById('buscaProduto');
const resultadoBusca = document.getElementById('resultadoBusca');
const ul = document.getElementById('listaProdutos');
const totalEl = document.getElementById('total');
const freteEl = document.getElementById('frete');

function valorProduto(produto){
  return Number(String(produto.preco || 0).replace('R$','').replace('.','').replace(',','.')) || 0;
}

function valorFrete(){
  return Number(String(freteEl.value || 0).replace('R$','').replace('.','').replace(',','.')) || 0;
}

function formatarBRL(valor){
  return valor.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
}

function skuProduto(index){
  return String(index + 1).padStart(4,'0');
}

function atualizarTotal(){
  const totalProdutos = lista.reduce((soma,item)=> soma + item.valor_unitario * item.quantidade,0);
  const total = totalProdutos + valorFrete();
  totalEl.textContent = formatarBRL(total);
}

function renderizarLista(){
  ul.innerHTML = '';

  lista.forEach((item,index)=>{
    const li = document.createElement('li');
    li.className = 'item-pedido';
    li.innerHTML = `
      <div class="produto-resumo">
        <strong>${item.sku} - ${item.produto}</strong>
        <span>Quantidade: ${item.quantidade}</span>
        <span>Valor unitário: ${formatarBRL(item.valor_unitario)}</span>
      </div>
      <button class="remover-produto" data-index="${index}">X</button>
    `;

    ul.appendChild(li);
  });

  document.querySelectorAll('.remover-produto').forEach(btn=>{
    btn.onclick=()=>{
      lista.splice(Number(btn.dataset.index),1);
      renderizarLista();
      atualizarTotal();
    };
  });
}

async function carregarCatalogo(){
  try{
    const resposta = await fetch(CATALOGO_URL);
    const codigo = await resposta.text();
    produtos = new Function(codigo + '\nreturn produtos;')();
  }catch(erro){
    console.error('Erro catálogo:',erro);
  }
}

busca.addEventListener('input',()=>{
  const termo = busca.value.toLowerCase().trim();
  resultadoBusca.innerHTML='';
  if(!termo) return;

  produtos.filter((p,index)=>{
    const sku = skuProduto(index);
    return p.nome.toLowerCase().includes(termo) || sku.includes(termo);
  }).slice(0,10).forEach(p=>{
    const index = produtos.indexOf(p);
    const div = document.createElement('div');
    div.textContent = `${skuProduto(index)} - ${p.nome} - ${p.preco || ''}`;

    div.onclick=()=>{
      produtoSelecionado = {produto:p,index};
      busca.value = `${skuProduto(index)} - ${p.nome}`;
      resultadoBusca.innerHTML='';
    };

    resultadoBusca.appendChild(div);
  });
});

document.getElementById('adicionarProduto').onclick=()=>{
  if(!produtoSelecionado) return;

  const quantidade = Number(document.getElementById('quantidade').value || 1);
  const produto = produtoSelecionado.produto;
  const index = produtoSelecionado.index;

  lista.push({
    sku: skuProduto(index),
    produto: produto.nome,
    quantidade,
    valor_unitario: valorProduto(produto)
  });

  produtoSelecionado = null;
  busca.value='';
  document.getElementById('quantidade').value=1;

  renderizarLista();
  atualizarTotal();
};

freteEl.addEventListener('input', atualizarTotal);

carregarCatalogo();

document.getElementById('finalizar').onclick=()=>{
 const pedido={
  cliente:document.getElementById('clienteNome').value,
  telefone:document.getElementById('clienteTelefone').value,
  vendedor:document.getElementById('vendedorNome').value,
  pagamento:document.getElementById('pagamento').value,
  observacoes:document.getElementById('observacoes').value,
  produtos:lista
 };
 console.log('Pedido criado:',pedido);
 alert('Pedido preparado com sucesso!');
};