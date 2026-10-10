import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Divider, Grid, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { api } from 'services/api';

const moeda = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
const inteiro = (v) => new Intl.NumberFormat('pt-BR').format(Number(v) || 0);
const dois = (n) => String(n).padStart(2, '0');
const dia = (d) => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
const periodoMes = (ano, mes) => ({ inicio: dia(new Date(ano, mes, 1)), fim: dia(new Date(ano, mes + 1, 0)) });
const dataLocal = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR');
const mesLabel = (ano, mes) => new Date(ano, mes, 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
const cor = { recebido: '#008e73', pendente: '#e49a16', despesas: '#d65758', saldo: '#1364ba', cancelado: '#8993a4' };
const inicial = () => { const d = new Date(); return periodoMes(d.getFullYear(), d.getMonth()); };
const normalizar = (r) => ({
  totalRecebido: Number(r?.totalRecebido) || 0,
  totalPendente: Number(r?.totalPendente) || 0,
  totalDespesas: Number(r?.totalDespesas) || 0,
  saldo: Number(r?.saldo) || 0,
  quantidadePagamentosPagos: Number(r?.quantidadePagamentosPagos) || 0,
  quantidadePagamentosPendentes: Number(r?.quantidadePagamentosPendentes) || 0,
  quantidadePagamentosCancelados: Number(r?.quantidadePagamentosCancelados) || 0
});

function Indicador({ titulo, valor, subtitulo, corDestaque }) {
  return <Paper variant="outlined" sx={{ p: 2.5, height: '100%', borderRadius: 2, borderTop: `4px solid ${corDestaque}` }}>
    <Typography variant="body2" color="text.secondary">{titulo}</Typography>
    <Typography variant="h3" sx={{ mt: 1, mb: 0.5, color: corDestaque, fontWeight: 700, overflowWrap: 'anywhere' }}>{valor}</Typography>
    <Typography variant="caption" color="text.secondary">{subtitulo}</Typography>
  </Paper>;
}

function Barras({ dados }) {
  const maior = Math.max(1, ...dados.flatMap((p) => [p.totalRecebido, p.totalDespesas]));
  return <Stack spacing={2}>
    <Stack direction="row" spacing={2} flexWrap="wrap">
      <Typography variant="caption"><Box component="span" sx={{ display: 'inline-block', width: 10, height: 10, bgcolor: cor.recebido, mr: 1, borderRadius: 0.5 }} />Recebido</Typography>
      <Typography variant="caption"><Box component="span" sx={{ display: 'inline-block', width: 10, height: 10, bgcolor: cor.despesas, mr: 1, borderRadius: 0.5 }} />Despesas</Typography>
    </Stack>
    {dados.map((p) => <Box key={p.inicio}>
      <Typography variant="body2" sx={{ mb: 0.75, fontWeight: 600, textTransform: 'capitalize' }}>{p.rotulo}</Typography>
      {[[p.totalRecebido, cor.recebido], [p.totalDespesas, cor.despesas]].map(([valor, corBarra], i) =>
        <Stack key={i} direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
          <Box sx={{ flex: 1, height: 14, borderRadius: 1, bgcolor: 'action.hover', overflow: 'hidden' }}>
            <Box sx={{ width: `${Math.max(0, valor / maior * 100)}%`, height: '100%', bgcolor: corBarra, borderRadius: 1 }} />
          </Box>
          <Typography variant="caption" sx={{ width: { xs: 94, sm: 118 }, textAlign: 'right', fontWeight: 600 }}>{moeda(valor)}</Typography>
        </Stack>)}
    </Box>)}
    <Typography variant="caption" color="text.secondary">Comparativo dos três últimos meses, consultados individualmente na API.</Typography>
  </Stack>;
}

function SituacaoPagamentos({ dados }) {
  const partes = [
    { nome: 'Pagos', valor: dados.quantidadePagamentosPagos, cor: cor.recebido },
    { nome: 'Pendentes', valor: dados.quantidadePagamentosPendentes, cor: cor.pendente },
    { nome: 'Cancelados', valor: dados.quantidadePagamentosCancelados, cor: cor.cancelado }
  ];
  const total = partes.reduce((s, p) => s + p.valor, 0);
  let atual = 0;
  const faixas = partes.map((p) => { const inicio = atual; atual += total ? p.valor / total * 100 : 0; return `${p.cor} ${inicio}% ${atual}%`; });
  return <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" justifyContent="center" spacing={4} sx={{ py: 2 }}>
    <Box role="img" aria-label={`Pagamentos: ${partes.map(p => `${p.nome} ${p.valor}`).join(', ')}`} sx={{ width: 176, height: 176, flexShrink: 0, borderRadius: '50%', background: total ? `conic-gradient(${faixas.join(', ')})` : 'linear-gradient(#e1e5ed,#e1e5ed)', display: 'grid', placeItems: 'center' }}>
      <Box sx={{ width: 118, height: 118, borderRadius: '50%', bgcolor: 'background.paper', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <Box><Typography variant="h3" fontWeight={700}>{inteiro(total)}</Typography><Typography variant="caption" color="text.secondary">pagamentos</Typography></Box>
      </Box>
    </Box>
    <Stack spacing={1.5} sx={{ minWidth: 165 }}>
      {partes.map(p => <Stack key={p.nome} direction="row" alignItems="center" justifyContent="space-between" spacing={3}>
        <Stack direction="row" alignItems="center" spacing={1}><Box sx={{ width: 11, height: 11, borderRadius: 0.5, bgcolor: p.cor }} /><Typography variant="body2">{p.nome}</Typography></Stack>
        <Typography fontWeight={700}>{inteiro(p.valor)}</Typography>
      </Stack>)}
    </Stack>
  </Stack>;
}

export default function Dashboard() {
  const [filtro, setFiltro] = useState('atual');
  const [intervalo, setIntervalo] = useState(inicial);
  const [dados, setDados] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [erroGrafico, setErroGrafico] = useState('');
  const [revisao, setRevisao] = useState(0);
  const datas = useMemo(() => {
    const agora = new Date();
    if (filtro === 'atual') return periodoMes(agora.getFullYear(), agora.getMonth());
    if (filtro === 'anterior') return periodoMes(agora.getFullYear(), agora.getMonth() - 1);
    if (filtro === 'ano') return { inicio: `${agora.getFullYear()}-01-01`, fim: `${agora.getFullYear()}-12-31` };
    return intervalo;
  }, [filtro, intervalo]);
  const valido = Boolean(datas.inicio && datas.fim && datas.inicio <= datas.fim);
  const carregar = useCallback(async () => {
    if (!valido) return;
    setCarregando(true); setErro(''); setErroGrafico('');
    try {
      const resultado = await api(`/dashboard?inicio=${encodeURIComponent(datas.inicio)}&fim=${encodeURIComponent(datas.fim)}`);
      setDados(normalizar(resultado));
    } catch (e) { setDados(null); setErro(e?.message || 'Não foi possível consultar o dashboard.'); }
    finally { setCarregando(false); }
    const hoje = new Date();
    const meses = [2, 1, 0].map((atras) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - atras, 1);
      return { ...periodoMes(d.getFullYear(), d.getMonth()), rotulo: mesLabel(d.getFullYear(), d.getMonth()) };
    });
    try {
      const respostas = await Promise.all(meses.map(async (p) => {
        const r = await api(`/dashboard?inicio=${p.inicio}&fim=${p.fim}`);
        return { ...p, ...normalizar(r) };
      }));
      setHistorico(respostas);
    } catch (e) { setHistorico([]); setErroGrafico('Não foi possível carregar o comparativo mensal.'); }
  }, [datas.inicio, datas.fim, valido]);
  useEffect(() => { carregar(); }, [carregar, revisao]);
  return <Stack spacing={3}>
    <Box sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: 3, color: 'white', background: 'linear-gradient(115deg,#00005c,#076ac4)' }}>
      <Typography variant="h3" color="inherit">Visão geral da Higienizei</Typography>
      <Typography sx={{ mt: 1, color: 'rgba(255,255,255,.85)' }}>Acompanhe os resultados financeiros e a situação dos pagamentos.</Typography>
    </Box>
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
        <Box><Typography variant="h5">Dashboard financeiro</Typography><Typography variant="body2" color="text.secondary">Escolha o período dos indicadores</Typography></Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <TextField select label="Período" size="small" value={filtro} onChange={e => setFiltro(e.target.value)} sx={{ minWidth: 180 }}>
            <MenuItem value="atual">Mês atual</MenuItem><MenuItem value="anterior">Mês anterior</MenuItem><MenuItem value="ano">Ano atual</MenuItem><MenuItem value="personalizado">Personalizado</MenuItem>
          </TextField>
          <Button variant="outlined" onClick={() => setRevisao(r => r + 1)} disabled={!valido || carregando}>Atualizar</Button>
        </Stack>
      </Stack>
      {filtro === 'personalizado' && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
        <TextField label="Data inicial" size="small" type="date" value={intervalo.inicio} onChange={e => setIntervalo(p => ({ ...p, inicio: e.target.value }))} InputLabelProps={{ shrink: true }} />
        <TextField label="Data final" size="small" type="date" value={intervalo.fim} onChange={e => setIntervalo(p => ({ ...p, fim: e.target.value }))} InputLabelProps={{ shrink: true }} />
      </Stack>}
      {!valido && <Alert severity="warning" sx={{ mt: 2 }}>Informe um intervalo válido: a data inicial deve ser anterior ou igual à data final.</Alert>}
      {valido && <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">Resultados de <strong>{dataLocal(datas.inicio)}</strong> até <strong>{dataLocal(datas.fim)}</strong></Typography>}
    </Paper>
    {erro && <Alert severity="error">{erro}</Alert>}
    {carregando && <Stack direction="row" alignItems="center" spacing={2}><CircularProgress size={24} /><Typography color="text.secondary">Carregando indicadores...</Typography></Stack>}
    {!carregando && dados && <>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><Indicador titulo="Total recebido" valor={moeda(dados.totalRecebido)} subtitulo="Pagamentos recebidos no período" corDestaque={cor.recebido} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><Indicador titulo="Total pendente" valor={moeda(dados.totalPendente)} subtitulo="Pagamentos ainda pendentes" corDestaque={cor.pendente} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><Indicador titulo="Total de despesas" valor={moeda(dados.totalDespesas)} subtitulo="Despesas registradas no período" corDestaque={cor.despesas} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}><Indicador titulo="Saldo" valor={moeda(dados.saldo)} subtitulo="Saldo calculado pelo backend" corDestaque={dados.saldo < 0 ? cor.despesas : cor.saldo} /></Grid>
      </Grid>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}><Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%' }}><Typography variant="h5">Recebimentos e despesas</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Evolução mensal</Typography><Divider sx={{ mb: 2 }} />{erroGrafico ? <Alert severity="warning">{erroGrafico}</Alert> : historico.length ? <Barras dados={historico} /> : <Typography color="text.secondary">Sem dados para o comparativo.</Typography>}</Paper></Grid>
        <Grid size={{ xs: 12, md: 5 }}><Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%' }}><Typography variant="h5">Situação dos pagamentos</Typography><Typography variant="body2" color="text.secondary">No período selecionado</Typography><Divider sx={{ mt: 2 }} /><SituacaoPagamentos dados={dados} /></Paper></Grid>
      </Grid>
      <Typography variant="caption" color="text.secondary">Os valores e as quantidades são fornecidos pela API do GestãoClean. O comparativo mensal utiliza consultas adicionais ao mesmo endpoint.</Typography>
    </>}
  </Stack>;
}
