import { IExpenseRepository } from '../../expenses/repositories/expense.repository.interface.js';
import { ExpenseCategory } from '../../expenses/entities/expense.entity.js';

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
  presupuesto?: number;
  porcentajePresupuesto?: number;
  categorias: CategorySummary[];
  numGastos: number;
}

export class SummaryService {
  constructor(private readonly expenseRepository: IExpenseRepository) {}

  async getMonthlySummary(year: number, month: number, presupuesto?: number): Promise<MonthlySummary> {
    const expenses = await this.expenseRepository.findAll({
      year: year.toString(),
      month: month.toString(),
    });

    const totalGastado = expenses.reduce((acc, curr) => acc + (curr.total || 0), 0);
    const categoryTotals: Record<string, { total: number; count: number }> = {};

    for (const exp of expenses) {
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

    const roundTotal = Math.round(totalGastado * 100) / 100;
    const porcentajePresupuesto = presupuesto && presupuesto > 0
      ? Math.round((roundTotal / presupuesto) * 100)
      : undefined;

    return {
      year,
      month,
      totalGastado: roundTotal,
      presupuesto,
      porcentajePresupuesto,
      categorias,
      numGastos: expenses.length,
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

    const categoryEmojis: Record<string, string> = {
      Supermercado: '🛒',
      Restauración: '🍽️',
      Transporte: '🚗',
      'Hogar y Servicios': '🏠',
      Tecnología: '💻',
      'Salud y Bienestar': '💊',
      'Ocio y Viajes': '🎬',
      Otros: '📦',
    };

    let text = `📊 *Resumen de ${monthName} ${summary.year}*\n\n`;

    if (summary.presupuesto) {
      const bar = renderProgressBar(summary.porcentajePresupuesto || 0, 15);
      text += `*Total gastado:* $${summary.totalGastado.toFixed(2)} de $${summary.presupuesto.toFixed(2)}\n`;
      text += `[${bar}] ${summary.porcentajePresupuesto}%\n\n`;
    } else {
      text += `*Total gastado:* $${summary.totalGastado.toFixed(2)} (${summary.numGastos} tickets)\n\n`;
    }

    if (summary.categorias.length === 0) {
      text += `_No se registraron gastos en este periodo._\n`;
    } else {
      text += `*Desglose por categorías:*\n`;
      for (const cat of summary.categorias) {
        const emoji = categoryEmojis[cat.categoria] || '📌';
        const bar = renderProgressBar(cat.porcentaje, 8);
        const paddedCat = cat.categoria.padEnd(16, ' ');
        text += `${emoji} ${paddedCat}: $${cat.total.toFixed(2)} [${bar}] ${cat.porcentaje}%\n`;
      }
    }

    text += `\n📄 *Responde "DETALLE" para ver la lista de tickets o "EXCEL" para exportar.*`;
    return text;
  }
}
