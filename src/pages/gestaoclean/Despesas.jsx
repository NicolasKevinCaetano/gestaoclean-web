import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography
} from '@mui/material';
import { api } from 'services/api';

const CATEGORIAS = ['Materiais', 'Combustível', 'Equipamentos', 'Manutenção', 'Marketing', 'Transporte', 'Alimentação', 'Outros'];
const dinheiro = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
const dataBR = (v) => {
  if (!v) return '—';
  const [dia, hora] = String(v).split('T');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return String(v);
  const [ano, mes, data] = dia.split('-');
  return `${data}/${mes}/${ano}${hora ? ` ${hora.slice(0, 5)}` : ''}`;
};
const agoraLocal = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fichaNova = () => ({ descricao: '', categoria: '', valor: '', dataDespesa: agoraLocal(), observacoes: '' });
const lista = (r) => Array.isArray(r) ? r : Array.isArray(r?.content) ? r.content : [];
const mensagem = (e) => e?.message || 'Não foi possível concluir a operação.';

export default function Despesas() {
  const [despesas, setDespesas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [dialog, setDialog] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formulario, setFormulario] = useState(fichaNova);
  const [erroDialog, setErroDialog] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [detalhe, setDetalhe] = useState(null);
  const [excluindo, setExcluindo] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true); setErro('');
    try {
      let caminho = '/despesas';
      if (inicio && fim) caminho = `/despesas/periodo?inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`;
      else if (categoria) caminho = `/despesas/categoria/${encodeURIComponent(categoria)}`;
      const resultado = lista(await api(caminho));
      setDespesas(resultado.sort((a, b) => String(b.dataDespesa || '').localeCompare(String(a.dataDespesa || '')) || Number(b.id) - Number(a.id)));
    } catch (e) { setErro(`Não foi possível carregar as despesas: ${mensagem(e)}`); }
    finally { setCarregando(false); }
  }, [inicio, fim, categoria]);

  useEffect(() => { carregar(); }, [carregar]);
  const categorias = useMemo(() => [...new Set([...CATEGORIAS, ...despesas.map(d => d.categoria).filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'pt-BR')), [despesas]);
  const visiveis = useMemo(() => despesas.filter(d => {
    const correspondeCategoria = !categoria || d.categoria === categoria;
    const data = String(d.dataDespesa || '').slice(0, 10);
    const correspondeData = (!inicio || data >= inicio) && (!fim || data <= fim);
    const correspondeBusca = [d.id, d.descricao, d.categoria, d.observacoes].join(' ').toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR'));
    return correspondeCategoria && correspondeData && correspondeBusca;
  }), [despesas, categoria, inicio, fim, busca]);
  const total = visiveis.reduce((acc, d) => acc + (Number(d.valor) || 0), 0);
  const porCategoria = useMemo(() => visiveis.reduce((acc, d) => {
    const nome = d.categoria || 'Sem categoria';
    acc[nome] = (acc[nome] || 0) + (Number(d.valor) || 0);
    return acc;
  }, {}), [visiveis]);
  const filtrosInvalidos = Boolean((inicio && !fim) || (!inicio && fim) || (inicio && fim && inicio > fim));
  const abrir = (despesa = null) => {
    setEditando(despesa?.id ?? null);
    setFormulario(despesa ? {
      descricao: despesa.descricao || '', categoria: despesa.categoria || '',
      valor: String(despesa.valor ?? ''), dataDespesa: String(despesa.dataDespesa || agoraLocal()).slice(0, 16),
      observacoes: despesa.observacoes || ''
    } : fichaNova());
    setErroDialog(''); setDialog(true);
  };
  const mudar = (campo, valor) => setFormulario(f => ({ ...f, [campo]: valor }));
  const salvar = async (evento) => {
    evento.preventDefault(); setErroDialog('');
    const valor = Number(String(formulario.valor).replace(',', '.'));
    if (!formulario.descricao.trim() || !formulario.categoria.trim()) { setErroDialog('Informe a descrição e a categoria.'); return; }
    if (!Number.isFinite(valor) || valor <= 0) { setErroDialog('O valor deve ser maior que zero.'); return; }
    if (!formulario.dataDespesa) { setErroDialog('Informe a data e o horário.'); return; }
    setSalvando(true);
    try {
      const corpo = { descricao: formulario.descricao.trim(), categoria: formulario.categoria.trim(), valor,
        dataDespesa: formulario.dataDespesa.length === 16 ? `${formulario.dataDespesa}:00` : formulario.dataDespesa,
        observacoes: formulario.observacoes.trim() };
      await api(editando ? `/despesas/${editando}` : '/despesas', { method: editando ? 'PUT' : 'POST', body: JSON.stringify(corpo) });
      setDialog(false); setSucesso(editando ? 'Despesa atualizada com sucesso.' : 'Despesa cadastrada com sucesso.');
      await carregar();
    } catch (e) { setErroDialog(mensagem(e)); }
    finally { setSalvando(false); }
  };
  const abrirDetalhe = async (despesa) => {
    try { setErro(''); setDetalhe(await api(`/despesas/${despesa.id}`)); }
    catch (e) { setErro(`Não foi possível consultar a despesa: ${mensagem(e)}`); }
  };
  const excluir = async () => {
    if (!excluindo) return;
    setSalvando(true); setErroDialog('');
    try {
      await api(`/despesas/${excluindo.id}`, { method: 'DELETE' });
      setExcluindo(null); setSucesso('Despesa excluída com sucesso.'); await carregar();
    } catch (e) { setErroDialog(mensagem(e)); }
    finally { setSalvando(false); }
  };

  return <Stack spacing={2}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2}>
      <Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="h4">Despesas</Typography><Typography color="text.secondary">Gerencie os gastos da Higienizei e acompanhe os custos por categoria e período.</Typography></Box>
      <Stack direction="row" spacing={1} sx={{ flexShrink: 0, alignSelf: { xs: "flex-start", sm: "center" } }}><Button variant="contained" onClick={() => abrir()}>Nova despesa</Button><Button variant="outlined" onClick={carregar}>Atualizar</Button></Stack>
    </Stack>
    {sucesso && <Alert severity="success" onClose={() => setSucesso('')}>{sucesso}</Alert>}
    {erro && <Alert severity="error" onClose={() => setErro('')}>{erro}</Alert>}
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <Paper variant="outlined" sx={{ p: 2, flex: 1 }}><Typography variant="body2" color="text.secondary">Total das despesas exibidas</Typography><Typography variant="h5">{dinheiro(total)}</Typography></Paper>
      <Paper variant="outlined" sx={{ p: 2, flex: 1 }}><Typography variant="body2" color="text.secondary">Quantidade de lançamentos</Typography><Typography variant="h5">{visiveis.length}</Typography></Paper>
      <Paper variant="outlined" sx={{ p: 2, flex: 1 }}><Typography variant="body2" color="text.secondary">Categorias com gastos</Typography><Typography variant="h5">{Object.keys(porCategoria).length}</Typography></Paper>
    </Stack>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap flexWrap="wrap" alignItems={{ md: "center" }}>
      <TextField size="small" label="Pesquisar descrição ou observações" value={busca} onChange={e => setBusca(e.target.value)} sx={{ minWidth: { xs: "100%", md: 240 }, flex: 1 }} />
      <TextField select size="small" label="Categoria" value={categoria} onChange={e => setCategoria(e.target.value)} sx={{ minWidth: 180 }}>
        <MenuItem value="">Todas as categorias</MenuItem>{categorias.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
      </TextField>
      <Box sx={{ width: { xs: "100%", sm: 190 }, minWidth: { sm: 175 }, flexShrink: 0 }}>
        <Typography component="label" htmlFor="despesas-data-inicial" variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>Data inicial</Typography>
        <TextField id="despesas-data-inicial" size="small" type="date" value={inicio} onChange={e => setInicio(e.target.value)} inputProps={{ "aria-label": "Data inicial" }} fullWidth />
      </Box>
      <Box sx={{ width: { xs: "100%", sm: 190 }, minWidth: { sm: 175 }, flexShrink: 0 }}>
        <Typography component="label" htmlFor="despesas-data-final" variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>Data final</Typography>
        <TextField id="despesas-data-final" size="small" type="date" value={fim} onChange={e => setFim(e.target.value)} inputProps={{ "aria-label": "Data final" }} fullWidth />
      </Box>
      <Button variant="text" onClick={() => { setBusca(''); setCategoria(''); setInicio(''); setFim(''); }}>Limpar filtros</Button>
    </Stack>
    {filtrosInvalidos && <Alert severity="info">Para filtrar por período, informe as duas datas, com a inicial anterior ou igual à final.</Alert>}
    <TableContainer component={Paper} variant="outlined"><Table size="small">
      <TableHead><TableRow><TableCell>ID</TableCell><TableCell>Descrição</TableCell><TableCell>Categoria</TableCell><TableCell>Data</TableCell><TableCell>Valor</TableCell><TableCell align="right">Ações</TableCell></TableRow></TableHead>
      <TableBody>{carregando ? <TableRow><TableCell colSpan={6} align="center"><CircularProgress size={24} sx={{ my: 2 }} /></TableCell></TableRow>
        : visiveis.length === 0 ? <TableRow><TableCell colSpan={6} align="center">Nenhuma despesa encontrada.</TableCell></TableRow>
        : visiveis.map(d => <TableRow key={d.id} hover>
          <TableCell>#{d.id}</TableCell><TableCell>{d.descricao}</TableCell><TableCell><Chip size="small" variant="outlined" label={d.categoria || '—'} /></TableCell>
          <TableCell>{dataBR(d.dataDespesa)}</TableCell><TableCell>{dinheiro(d.valor)}</TableCell>
          <TableCell align="right"><Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button size="small" onClick={() => abrirDetalhe(d)}>Detalhes</Button>
            <Button size="small" onClick={() => abrir(d)}>Editar</Button>
            <Button size="small" color="error" onClick={() => { setErroDialog(''); setExcluindo(d); }}>Excluir</Button>
          </Stack></TableCell>
        </TableRow>)}
      </TableBody></Table></TableContainer>
    {Object.keys(porCategoria).length > 0 && <Paper variant="outlined" sx={{ p: 2 }}><Typography variant="h6" sx={{ mb: 1 }}>Gastos por categoria</Typography>
      <Stack direction="row" gap={1} flexWrap="wrap">{Object.entries(porCategoria).sort((a, b) => b[1] - a[1]).map(([nome, valor]) => <Chip key={nome} label={`${nome}: ${dinheiro(valor)}`} variant="outlined" />)}</Stack>
    </Paper>}
    <Dialog open={dialog} onClose={() => !salvando && setDialog(false)} fullWidth maxWidth="sm"><Box component="form" onSubmit={salvar}>
      <DialogTitle>{editando ? `Editar despesa #${editando}` : 'Nova despesa'}</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
        {erroDialog && <Alert severity="error">{erroDialog}</Alert>}
        <TextField fullWidth required label="Descrição" value={formulario.descricao} onChange={e => mudar('descricao', e.target.value)} />
        <TextField fullWidth required label="Categoria" value={formulario.categoria} onChange={e => mudar('categoria', e.target.value)} helperText="Selecione uma sugestão ou digite outra categoria." />
        <Stack direction="row" flexWrap="wrap" gap={1}>{CATEGORIAS.map(c => <Chip key={c} label={c} size="small" variant={formulario.categoria === c ? 'filled' : 'outlined'} color={formulario.categoria === c ? 'primary' : 'default'} onClick={() => mudar('categoria', c)} />)}</Stack>
        <TextField fullWidth required label="Valor (R$)" type="number" inputProps={{ min: '0.01', step: '0.01' }} value={formulario.valor} onChange={e => mudar('valor', e.target.value)} />
        <TextField fullWidth required label="Data e horário" type="datetime-local" value={formulario.dataDespesa} onChange={e => mudar('dataDespesa', e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField fullWidth multiline minRows={3} label="Observações" value={formulario.observacoes} onChange={e => mudar('observacoes', e.target.value)} />
      </Stack></DialogContent>
      <DialogActions><Button onClick={() => setDialog(false)} disabled={salvando}>Cancelar</Button><Button type="submit" variant="contained" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar despesa'}</Button></DialogActions>
    </Box></Dialog>
    <Dialog open={Boolean(detalhe)} onClose={() => setDetalhe(null)} fullWidth maxWidth="sm">
      <DialogTitle>Detalhes da despesa #{detalhe?.id}</DialogTitle>
      <DialogContent><Stack spacing={1}>
        <Typography><strong>Descrição:</strong> {detalhe?.descricao || '—'}</Typography>
        <Typography><strong>Categoria:</strong> {detalhe?.categoria || '—'}</Typography>
        <Typography><strong>Valor:</strong> {dinheiro(detalhe?.valor)}</Typography>
        <Typography><strong>Data:</strong> {dataBR(detalhe?.dataDespesa)}</Typography>
        <Typography><strong>Observações:</strong> {detalhe?.observacoes || '—'}</Typography>
      </Stack></DialogContent><DialogActions><Button onClick={() => setDetalhe(null)}>Fechar</Button></DialogActions>
    </Dialog>
    <Dialog open={Boolean(excluindo)} onClose={() => !salvando && setExcluindo(null)} fullWidth maxWidth="xs">
      <DialogTitle>Excluir despesa</DialogTitle><DialogContent><Stack spacing={2}>
        {erroDialog && <Alert severity="error">{erroDialog}</Alert>}
        <Typography>Deseja excluir definitivamente a despesa #{excluindo?.id} — {excluindo?.descricao}?</Typography>
      </Stack></DialogContent><DialogActions><Button disabled={salvando} onClick={() => setExcluindo(null)}>Voltar</Button><Button disabled={salvando} variant="contained" color="error" onClick={excluir}>{salvando ? 'Excluindo...' : 'Excluir'}</Button></DialogActions>
    </Dialog>
  </Stack>;
}
