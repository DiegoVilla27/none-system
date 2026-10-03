import { IExpenseRepository, MonthAggregate } from '../../expenses/repositories/expense.repository.interface.js';
import { Expense, ExpenseCategory } from '../../expenses/entities/expense.entity.js';
import { bogotaMonthRange } from '../../../core/utils/dates.js';
import { ExpenseQuerySpec } from '../../expenses/query/expense-query.js';
import { normalizeText } from '../../expenses/manual/manual-expense.parser.js';

export interface CategorySummary {
  categoria: ExpenseCategory;
  total: number;
  porcentaje: number;
  numTickets: number;
}

export interface MonthlySummary {
  year: number;
  month: number;
  totalGastado: number;
  totalFacturas: number;
  totalTransferencias: number;
  totalManuales: number;
  numFacturas: number;
  numTransferencias: number;
  numManuales: number;
  numGastos: number;
  categorias: CategorySummary[];
}

/** Registros hechos en un mes cuya fecha de documento pertenece a otro mes. */
export interface OutOfPeriodRegistrations {
  count: number;
  total: number;
  /** Meses (YYYY-MM) a los que pertenecen, del más reciente al más antiguo. */
  months: string[];
}

/** Resultado de una consulta en lenguaje natural (todo calculado en el backend, nunca por la IA). */
export interface QueryResult {
  spec: ExpenseQuerySpec;
  count: number;
  total: number;
  byType: Record<'factura' | 'transferencia' | 'manual', { count: number; total: number }>;
  byMonth: MonthAggregate[];
  byCategory: Array<{ categoria: ExpenseCategory; total: number; count: number }>;
  taxes: { iva: number; impoconsumo: number; total: number; documents: number };
  items: Expense[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const comparable = (value: string) => normalizeText(value).replace(/[^a-z0-9]/g, '');

export class SummaryService {
  constructor(private readonly expenseRepository: IExpenseRepository) {}

  /**
   * Ejecuta una consulta interpretada de lenguaje natural sobre los gastos de UN usuario.
   * El comercio se busca sin tildes ni mayúsculas, en el nombre y en los conceptos registrados.
   */
  async runQuery(userId: string, spec: ExpenseQuerySpec): Promise<QueryResult> {
    let expenses = await this.expenseRepository.findAll({
      userId,
      fechaFrom: spec.from,
      fechaTo: spec.to,
      tipoDocumento: spec.tipoDocumento,
      categoria: spec.categoria,
    });

    if (spec.comercio) {
      const needle = comparable(spec.comercio);
      expenses = expenses.filter(
        (e) =>
          comparable(e.comercio).includes(needle) ||
          e.lineasArticulos.some((l) => comparable(l.descripcion).includes(needle))
      );
    }

    const byType: QueryResult['byType'] = {
      factura: { count: 0, total: 0 },
      transferencia: { count: 0, total: 0 },
      manual: { count: 0, total: 0 },
    };
    const months = new Map<string, MonthAggregate>();
    const categories = new Map<ExpenseCategory, { categoria: ExpenseCategory; total: number; count: number }>();
    const taxes = { iva: 0, impoconsumo: 0, total: 0, documents: 0 };

    for (const e of expenses) {
      byType[e.tipoDocumento].count += 1;
      byType[e.tipoDocumento].total += e.total;

      const month = e.fecha.slice(0, 7);
      const m = months.get(month) ?? { month, count: 0, total: 0 };
      m.count += 1;
      m.total += e.total;
      months.set(month, m);

      const c = categories.get(e.categoria) ?? { categoria: e.categoria, total: 0, count: 0 };
      c.count += 1;
      c.total += e.total;
      categories.set(e.categoria, c);

      const iva = e.iva ?? 0;
      const inc = e.impoconsumo ?? 0;
      if (iva > 0 || inc > 0) {
        taxes.iva += iva;
        taxes.impoconsumo += inc;
        taxes.documents += 1;
      }
    }
    taxes.total = taxes.iva + taxes.impoconsumo;

    const sorted = [...expenses].sort((a, b) =>
      spec.sort === 'mayor'
        ? b.total - a.total
        : spec.sort === 'menor'
        ? a.total - b.total
        : b.fecha.localeCompare(a.fecha) || b.createdAt.localeCompare(a.createdAt)
    );

    return {
      spec,
      count: expenses.length,
      total: round2(expenses.reduce((acc, e) => acc + e.total, 0)),
      byType,
      byMonth: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
      byCategory: [...categories.values()].sort((a, b) => b.total - a.total),
      taxes: { iva: round2(taxes.iva), impoconsumo: round2(taxes.impoconsumo), total: round2(taxes.total), documents: taxes.documents },
      items: sorted.slice(0, spec.limit),
    };
  }

  /** Meses con registros (por fecha del documento), del más reciente al más antiguo. */
  async getMonthsOverview(userId: string, limit = 6): Promise<{ months: MonthAggregate[]; totalMonths: number }> {
    const all = await this.expenseRepository.aggregateByMonth(userId);
    return { months: all.slice(0, limit), totalMonths: all.length };
  }

  /** Totales por mes de un año completo. */
  async getYearOverview(userId: string, year: number): Promise<{ months: MonthAggregate[]; count: number; total: number }> {
    const months = (await this.expenseRepository.aggregateByMonth(userId, { year })).sort((a, b) => a.month.localeCompare(b.month));
    return {
      months,
      count: months.reduce((acc, m) => acc + m.count, 0),
      total: Math.round(months.reduce((acc, m) => acc + m.total, 0) * 100) / 100,
    };
  }

  /** Últimos registros de un mes (por fecha del documento) y cuántos hay en total. */
  async getRecentInMonth(userId: string, year: number, month: number, limit = 10): Promise<{ items: Expense[]; totalCount: number }> {
    const filter = { userId, year: String(year), month: String(month) };
    const [items, aggregates] = await Promise.all([
      this.expenseRepository.findAll({ ...filter, limit }),
      this.expenseRepository.aggregateByMonth(userId, { year }),
    ]);
    const key = `${year}-${String(month).padStart(2, '0')}`;
    return { items, totalCount: aggregates.find((m) => m.month === key)?.count ?? items.length };
  }

  /**
   * Gastos registrados durante el mes indicado (hora de Colombia) cuya fecha de documento es de otro mes.
   * Sirve para avisar que esos registros aparecen en el resumen de su propio mes.
   */
  async getOutOfPeriodRegistrations(userId: string, year: number, month: number): Promise<OutOfPeriodRegistrations> {
    const { from, to } = bogotaMonthRange(year, month);
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const registered = await this.expenseRepository.findAll({ userId, createdFrom: from, createdTo: to });
    const outside = registered.filter((e) => !e.fecha.startsWith(prefix));
    return {
      count: outside.length,
      total: Math.round(outside.reduce((acc, e) => acc + e.total, 0) * 100) / 100,
      months: [...new Set(outside.map((e) => e.fecha.slice(0, 7)))].sort().reverse(),
    };
  }

  async getMonthlySummary(year: number, month: number, userId?: string): Promise<MonthlySummary> {
    const expenses = await this.expenseRepository.findAll({
      year: year.toString(),
      month: month.toString(),
      userId,
    });

    const totalGastado = expenses.reduce((acc, curr) => acc + (curr.total || 0), 0);
    const categoryTotals: Record<string, { total: number; count: number }> = {};

    let totalFacturas = 0;
    let totalTransferencias = 0;
    let totalManuales = 0;
    let numFacturas = 0;
    let numTransferencias = 0;
    let numManuales = 0;

    for (const exp of expenses) {
      if (exp.tipoDocumento === 'transferencia') {
        totalTransferencias += exp.total;
        numTransferencias += 1;
      } else if (exp.tipoDocumento === 'manual') {
        totalManuales += exp.total;
        numManuales += 1;
      } else {
        totalFacturas += exp.total;
        numFacturas += 1;
      }

      if (!categoryTotals[exp.categoria]) {
        categoryTotals[exp.categoria] = { total: 0, count: 0 };
      }
      categoryTotals[exp.categoria].total += exp.total;
      categoryTotals[exp.categoria].count += 1;
    }

    const categorias: CategorySummary[] = Object.entries(categoryTotals)
      .map(([cat, val]) => ({
        categoria: cat as ExpenseCategory,
        total: Math.round(val.total * 100) / 100,
        porcentaje: totalGastado > 0 ? Math.round((val.total / totalGastado) * 100) : 0,
        numTickets: val.count,
      }))
      .sort((a, b) => b.total - a.total);

    return {
      year,
      month,
      totalGastado: Math.round(totalGastado * 100) / 100,
      totalFacturas: Math.round(totalFacturas * 100) / 100,
      totalTransferencias: Math.round(totalTransferencias * 100) / 100,
      totalManuales: Math.round(totalManuales * 100) / 100,
      numFacturas,
      numTransferencias,
      numManuales,
      numGastos: expenses.length,
      categorias,
    };
  }

  generateWhatsAppText(summary: MonthlySummary): string {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    const monthName = monthNames[summary.month - 1] || `Mes ${summary.month}`;

    const renderProgressBar = (percent: number, length = 10): string => {
      const filled = Math.min(length, Math.max(0, Math.round((percent / 100) * length)));
      const empty = length - filled;
      return '█'.repeat(filled) + '░'.repeat(empty);
    };

    const formatCOP = (val: number): string =>
      '$' + Math.round(val).toLocaleString('es-CO') + ' COP';

    const categoryEmojis: Record<string, string> = {
      Supermercado: '🛒',
      Restauración: '🍽️',
      Transporte: '🚗',
      'Hogar y Servicios': '🏠',
      Tecnología: '💻',
      'Salud y Bienestar': '💊',
      'Ocio y Viajes': '🎬',
      'Transferencias y Finanzas': '🏦',
      Otros: '📦',
    };

    let text = `📊 *Resumen de ${monthName} ${summary.year}*\n\n`;
    text += `*Total gastado:* ${formatCOP(summary.totalGastado)} (${summary.numGastos} ${summary.numGastos === 1 ? 'registro' : 'registros'})\n`;
    if (summary.numFacturas > 0) {
      text += `🧾 *Facturas:* ${formatCOP(summary.totalFacturas)} (${summary.numFacturas})\n`;
    }
    if (summary.numTransferencias > 0) {
      text += `🏦 *Transferencias:* ${formatCOP(summary.totalTransferencias)} (${summary.numTransferencias})\n`;
    }
    if (summary.numManuales > 0) {
      text += `✍️ *Gastos manuales (sin soporte):* ${formatCOP(summary.totalManuales)} (${summary.numManuales})\n`;
    }
    text += `\n`;

    if (summary.categorias.length === 0) {
      text += `_No se registraron gastos en este periodo._\n`;
    } else {
      text += `*Desglose por categorías:*\n`;
      for (const cat of summary.categorias) {
        const emoji = categoryEmojis[cat.categoria] || '📌';
        const bar = renderProgressBar(cat.porcentaje, 8);
        const paddedCat = cat.categoria.padEnd(20, ' ');
        text += `${emoji} ${paddedCat}: ${formatCOP(cat.total)} [${bar}] ${cat.porcentaje}%\n`;
      }
    }

    text += `\n📄 Consulta el detalle y exporta a Excel desde tu backoffice web.`;
    return text;
  }
}
