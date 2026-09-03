const CATALOGO_URL = 'https://raw.githubusercontent.com/lucashzm/Catalogo_online_Decoralar/main/produtos.js';

let produtos = [];
const lista = [];

const select = document.getElementById('produtoSelect');
const ul = document.getElementById('listaProdutos');
const totalEl = document.getElementById('total');

function atualizarTotal(){
  const total = lista.reduce((soma, item) => soma + (item.valor_unitario * item.quantidade), 0);
  if(totalEl) totalEl.textContent = total.toFixed(2).replace('.', ',');
}

async function carregarCatalogo(){
  try {
    const resposta = await fetch(CATALOGO_URL);
    const codigo = await resposta.text();

    produtos = new Function(codigo + '\nreturn produtos;')();

    select.innerHTML = '<option value="">Selecione um produto</option>';

    produtos.forEach((p, index)=>{
      const option = document.createElement('option');
      option.value = index;
      option.textContent = `${p.nome} - ${p.preco || ''}`;
      select.appendChild(option);
    });
  } catch (erro) {
    console.error('Erro catálogo:', erro);
    select.innerHTML = '<option>Erro ao carregar catálogo</option>';
  }
}

carregarCatalogo();

document.getElementById('adicionarProduto').onclick = () => {
  const produto = produtos[select.value];
  const quantidade = Number(document.getElementById('quantidade').value || 1);

  if(!produto) return;

  const preco = Number(String(produto.preco || 0).replace('R$','').replace('.','').replace(',','.')) || 0;

  lista.push({
    produto: produto.nome,
    quantidade,
    valor_unitario: preco
  });

  const li = document.createElement('li');
  li.textContent = `${quantidade}x ${produto.nome} - ${produto.preco}`;
  ul.appendChild(li);

  atualizarTotal();
};

document.getElementById('finalizar').onclick = () => {
  const pedido = {
    cliente: document.getElementById('clienteNome').value,
    telefone: document.getElementById('clienteTelefone').value,
    vendedor: document.getElementById('vendedorNome').value,
    pagamento: document.getElementById('pagamento').value,
    observacoes: document.getElementById('observacoes').value,
    produtos: lista
  };

  console.log('Pedido criado:', pedido);
  alert('Pedido preparado com sucesso!');
};