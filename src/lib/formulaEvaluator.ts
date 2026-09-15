/**
 * Safe Mathematical Expression Evaluator
 * Evaluates custom formulas for payroll (overtime, deduction, allowance)
 * without using dangerous eval() or Function constructor.
 * Variables supported: base_salary, hours, point
 */

export interface FormulaContext {
  base_salary?: number;
  monthly_base_salary?: number;
  gaji_pokok?: number;
  upah_jam?: number;
  hours?: number;
  jam?: number;
  point?: number;
  points?: number;
  jam_kerja?: number;
  ot_hours?: number;
  jam_lembur?: number;
  late_count?: number;
  jumlah_telat?: number;
  gross_salary?: number;
  gaji_kotor?: number;
  multiplier?: number;
  kelipatan?: number;
  fixed_amount?: number;
  amount?: number;
  nominal?: number;
  percentage?: number;
  persentase?: number;
}

export function evaluateFormula(
  formula: string,
  context: FormulaContext
): number {
  const res = evaluateSafeFormula(formula, context);
  return res.success ? res.result : 0;
}

export function evaluateSafeFormula(
  formula: string,
  context: FormulaContext
): { success: boolean; result: number; error?: string } {
  if (!formula || typeof formula !== 'string' || formula.trim() === '') {
    return { success: false, result: 0, error: 'Formula is empty' };
  }

  // Tokenize safely
  try {
    let sanitized = formula.trim();

    const baseSalary = Number(context.base_salary ?? context.upah_jam ?? 25000);
    const monthlyBase = Number(context.gaji_pokok ?? context.monthly_base_salary ?? (baseSalary * 173));
    const grossSalary = Number(context.gross_salary ?? context.gaji_kotor ?? (baseSalary * 173));
    const workPoints = Number(context.points ?? context.point ?? context.jam_kerja ?? context.hours ?? 0);
    const workHours = Number(context.hours ?? context.jam ?? workPoints);
    const otHours = Number(context.ot_hours ?? context.jam_lembur ?? 0);
    const lateCount = Number(context.late_count ?? context.jumlah_telat ?? 0);
    const multiplierVal = Number(context.multiplier ?? context.kelipatan ?? 1);
    const fixedAmt = Number(context.fixed_amount ?? context.amount ?? context.nominal ?? 0);
    const pctVal = Number(context.percentage ?? context.persentase ?? 0);

    // Order replacement by specificity (longest words first) to avoid partial collision
    sanitized = sanitized
      .replace(/\bgaji_pokok\b/gi, String(monthlyBase))
      .replace(/\bmonthly_base_salary\b/gi, String(monthlyBase))
      .replace(/\bgross_salary\b/gi, String(grossSalary))
      .replace(/\bgaji_kotor\b/gi, String(grossSalary))
      .replace(/\bbase_salary\b/gi, String(baseSalary))
      .replace(/\bupah_jam\b/gi, String(baseSalary))
      .replace(/\bjam_lembur\b/gi, String(otHours))
      .replace(/\bot_hours\b/gi, String(otHours))
      .replace(/\bjumlah_telat\b/gi, String(lateCount))
      .replace(/\blate_count\b/gi, String(lateCount))
      .replace(/\btelat\b/gi, String(lateCount))
      .replace(/\bjam_kerja\b/gi, String(workPoints))
      .replace(/\bpoints\b/gi, String(workPoints))
      .replace(/\bpoint\b/gi, String(workPoints))
      .replace(/\bhours\b/gi, String(workHours))
      .replace(/\bjam\b/gi, String(workHours))
      .replace(/\bmultiplier\b/gi, String(multiplierVal))
      .replace(/\bkelipatan\b/gi, String(multiplierVal))
      .replace(/\bfixed_amount\b/gi, String(fixedAmt))
      .replace(/\bamount\b/gi, String(fixedAmt))
      .replace(/\bnominal\b/gi, String(fixedAmt))
      .replace(/\bpercentage\b/gi, String(pctVal))
      .replace(/\bpersentase\b/gi, String(pctVal));

    // Validate characters allowed: digits, decimals, +, -, *, /, %, (, ), spaces
    if (!/^[0-9+\-*/().\s%]+$/.test(sanitized)) {
      return {
        success: false,
        result: 0,
        error: 'Formula berisi karakter tidak dikenal. Variabel yang didukung: base_salary, gaji_pokok, gross_salary, points, hours, ot_hours, late_count, multiplier, fixed_amount, percentage',
      };
    }

    // Convert percentage like 5% to (5/100)
    sanitized = sanitized.replace(/([0-9.]+)\s*%/g, '($1/100)');

    // Safe recursive-descent parser for arithmetic: + - * / ( )
    const tokens = sanitized.match(/\d+(\.\d+)?|[+\-*/()]/g);
    if (!tokens) {
      return { success: false, result: 0, error: 'No valid math tokens found' };
    }

    let pos = 0;

    function peek(): string | null {
      return pos < tokens!.length ? tokens![pos] : null;
    }

    function consume(): string {
      return tokens![pos++];
    }

    function parseFactor(): number {
      const token = consume();
      if (token === '(') {
        const result = parseExpression();
        if (consume() !== ')') {
          throw new Error('Mismatched parentheses');
        }
        return result;
      } else if (token === '+') {
        return parseFactor();
      } else if (token === '-') {
        return -parseFactor();
      } else {
        const num = parseFloat(token);
        if (isNaN(num)) {
          throw new Error(`Invalid numeric token: ${token}`);
        }
        return num;
      }
    }

    function parseTerm(): number {
      let left = parseFactor();
      while (peek() === '*' || peek() === '/') {
        const op = consume();
        const right = parseFactor();
        if (op === '*') {
          left *= right;
        } else if (op === '/') {
          if (right === 0) throw new Error('Division by zero');
          left /= right;
        }
      }
      return left;
    }

    function parseExpression(): number {
      let left = parseTerm();
      while (peek() === '+' || peek() === '-') {
        const op = consume();
        const right = parseTerm();
        if (op === '+') {
          left += right;
        } else if (op === '-') {
          left -= right;
        }
      }
      return left;
    }

    const calculated = parseExpression();

    if (pos < tokens.length) {
      throw new Error('Unexpected tokens at end of formula');
    }

    if (!isFinite(calculated) || isNaN(calculated)) {
      throw new Error('Calculation resulted in non-finite number');
    }

    return {
      success: true,
      result: Math.max(0, Math.round(calculated * 100) / 100),
    };
  } catch (err: any) {
    return {
      success: false,
      result: 0,
      error: err.message || 'Syntax error in formula',
    };
  }
}
