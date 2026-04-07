// sql-parser.ts
import moo from 'moo';
import i18n from "@/i18n";

// ========================
// 1. Token 定义
// ========================
const lexer = moo.compile({
  // 空白和注释（跳过）
  ws: { match: /[ \t\r\n]+/, lineBreaks: true }, // 👈 关键：加上 lineBreaks: true
  comment: /\/\/.*?$/,

  // 括号与标点
  lparen: '(',
  rparen: ')',
  comma: ',',
  dot: '.',
  star: '*',
  semicolon: ';',

  // 关键字（大写字面量，解析时做大小写兼容）
  select: 'SELECT',
  from: 'FROM',
  where: 'WHERE',
  as: 'AS',
  term: 'TERM',
  match: 'MATCH',
  order: 'ORDER',
  by: 'BY',
  limit: 'LIMIT',
  offset: 'OFFSET',
  // 排序方向
  asc: 'ASC',
  desc: 'DESC',
  is: 'IS',
  not: 'NOT',
  null: 'NULL',
  like: 'LIKE',
  and: 'AND',
  or: 'OR',
  // 全局变量
  current_timestamp: 'CURRENT_TIMESTAMP',

  // 操作符（优先匹配长串）
  lte: '<=',
  gte: '>=',
  neq: ['!=', '<>'],
  lt: '<',
  gt: '>',
  eq: '=',

  // 字面量
  string: /'(?:\\['\\]|[^'\n\\])*'/,
  number: /\d+(?:\.\d+)?/,

  // 标识符：允许 @ 与 -，不包含 .（保留 . 用于 table.* 检测）
  ident: /[a-zA-Z_@][a-zA-Z0-9_@-]*/,

  // 反引号标识符（支持空格、特殊字符）
  backtick: /`(?:\\[`\\]|[^`\n\\])*`/,
});

/**
 * 支持的方法表达式
 */
export type ExprFunctionName = "CONCAT" | "DATE_FORMAT" | "UNIX_TIMESTAMP";

export type ExprFunctionCall = {
  type: 'FunctionCall';
  name: string;
  args: Expr[];
}

// ========================
// 2. AST 节点类型
// ========================
export type Expr =
  // 标识符：普通字段名
  | { type: 'Identifier'; name: string }
  // 字符串字面量
  | { type: 'StringLiteral'; value: string }
  // 数字字面量
  | { type: 'NumberLiteral'; value: number }
  // 函数调用
  | ExprFunctionCall
  // 全局变量
  | { type: 'GlobalVariable'; name: string }
  // * 通配符
  | { type: 'Star' }
  // 表名.* 通配符
  | { type: 'QualifiedStar'; table: string };

export type SelectItem = {
  expr: Expr;
  alias: string;
};

export type Condition =
  | { type: 'BinaryOp'; op: string; left: Expr; right: Expr }
  | { type: 'IsNull'; expr: Expr; not: boolean }
  | { type: 'Like'; expr: Expr; pattern: string }
  | { type: 'LogicalOp'; op: 'AND' | 'OR'; left: Condition; right: Condition }
  | { type: 'Paren'; condition: Condition };

export type OrderBy = {
  field: string;
  direction: 'ASC' | 'DESC';
};

export type Query = {
  select: SelectItem[];
  from: string;
  where?: Condition;
  orderBy?: OrderBy[];
  limit?: number;
  offset?: number;
};

// ========================
// 3. Parser
// ========================
export class SQLParser {
  private tokens: moo.Token[];
  private pos = 0;
  private eofToken: moo.Token = {
    type: 'EOF',
    value: '',
    offset: 0,
    line: 0,
    col: 0,
    toString() { return 'EOF'; }
  } as moo.Token;

  constructor(input: string) {
    lexer.reset(input);
    this.tokens = Array.from(lexer);
    // 移除 ws 和 comment
    this.tokens = this.tokens.filter(t => t.type !== 'ws' && t.type !== 'comment');
  }

  private peek(offset = 0): moo.Token {
    return this.tokens[this.pos + offset] || this.eofToken;
  }

  private consume(expectedType?: string): moo.Token {
    const token = this.tokens[this.pos++];
    if (!token) throw new Error(i18n.global.t('core.sql.unexpected_end'));
    if (expectedType && token.type !== expectedType) {
      throw new Error(i18n.global.t('core.sql.expected_token', {expected: expectedType, got: token.type + ` ("${token.value}")`}));
    }
    return token;
  }

  private isKeyword(word: string): boolean {
    const t = this.peek();
    const k = word.toUpperCase();
    const type = word.toLowerCase();
    return t.type === type || (t.type === 'ident' && String(t.value).toUpperCase() === k);
  }

  private consumeKeyword(word: string): void {
    const t = this.peek();
    const k = word.toUpperCase();
    const type = word.toLowerCase();
    if (t.type === type) {
      this.consume(type);
      return;
    }
    if (t.type === 'ident' && String(t.value).toUpperCase() === k) {
      this.consume('ident');
      return;
    }
    throw new Error(i18n.global.t('core.sql.expected_keyword', {keyword: word, got: t.type + ` ("${t.value}")`}));
  }

  parse(): Query {
    this.consumeKeyword('SELECT');
    const selectItems = this.parseSelectList();
    this.consumeKeyword('FROM');
    const from = this.parseTableName();

    let where: Condition | undefined;
    let orderBy: OrderBy[] | undefined;
    let limit: number | undefined;
    let offset: number | undefined;

    // WHERE
    if (this.isKeyword('WHERE')) {
      this.consumeKeyword('WHERE');
      where = this.parseCondition();
    }

    // ORDER BY
    if (this.isKeyword('ORDER')) {
      this.consumeKeyword('ORDER');
      this.consumeKeyword('BY');
      orderBy = [];
      do {
        const field = this.parseFieldName();
        let direction: 'ASC' | 'DESC' = 'ASC';
        if (this.peek().type === 'asc' || (this.peek().type === 'ident' && this.peek().value.toUpperCase() === 'ASC')) {
          if (this.peek().type === 'asc') this.consume('asc'); else this.consume('ident');
          direction = 'ASC';
        } else if (this.peek().type === 'desc' || (this.peek().type === 'ident' && this.peek().value.toUpperCase() === 'DESC')) {
          if (this.peek().type === 'desc') this.consume('desc'); else this.consume('ident');
          direction = 'DESC';
        }
        orderBy.push({ field, direction });
      } while (this.peek().type === 'comma' && this.consume('comma'));
    }

    // LIMIT
    if (this.isKeyword('LIMIT')) {
      this.consumeKeyword('LIMIT');
      limit = Number(this.consume('number').value);
      if (this.isKeyword('OFFSET')) {
        this.consumeKeyword('OFFSET');
        offset = Number(this.consume('number').value);
      }
    }

    return { select: selectItems, from, where, orderBy, limit, offset };
  }

  private parseSelectList(): SelectItem[] {
    const items: SelectItem[] = [];
    do {
      const expr = this.parseExpr();
      let alias = this.getDefaultAlias(expr);
      if (this.isKeyword('AS')) {
        if (expr.type === 'Star' || expr.type === 'QualifiedStar') {
          throw new Error(i18n.global.t('core.sql.alias_not_allowed'));
        }
        this.consumeKeyword('AS');
        alias = this.parseAlias();
      }
      items.push({ expr, alias });
    } while (this.peek().type === 'comma' && this.consume('comma'));
    return items;
  }

  private parseExpr(): Expr {
    // 反引号字段
    if (this.peek().type === 'backtick') {
      const next1 = this.peek(1).type;
      const next2 = this.peek(2).type;
      if (next1 === 'dot' && next2 === 'star') {
        const raw = this.consume('backtick').value;
        this.consume('dot');
        this.consume('star');
        return { type: 'QualifiedStar', table: raw.slice(1, -1) };
      }
      const raw = this.consume('backtick').value;
      return { type: 'Identifier', name: raw.slice(1, -1) };
    }

    // 全局变量
    if (this.peek().type === 'current_timestamp') {
      this.consume('current_timestamp');
      return { type: 'GlobalVariable', name: 'CURRENT_TIMESTAMP' };
    }

    // 普通标识符
    if (this.peek().type === 'ident') {
      const ident = this.consume('ident').value;
      // 检查是否是函数调用
      if (this.peek().type === 'lparen') {
        this.consume('lparen');
        const args: Expr[] = [];
        if (this.peek().type !== 'rparen') {
          do {
            args.push(this.parseExpr());
          } while (this.peek().type === 'comma' && this.consume('comma'));
        }
        this.consume('rparen');
        return { type: 'FunctionCall', name: ident.toUpperCase(), args };
      }
      if (this.peek().type === 'dot' && this.peek(1).type === 'star') {
        this.consume('dot');
        this.consume('star');
        return { type: 'QualifiedStar', table: ident };
      }
      return { type: 'Identifier', name: ident };
    }

    // 星号，表示选择所有字段
    if (this.peek().type === 'star') {
      this.consume('star');
      return { type: 'Star' };
    }

    // 字符串字面量
    if (this.peek().type === 'string') {
      const raw = this.consume('string').value;
      return { type: 'StringLiteral', value: raw.slice(1, -1) };
    }

    // 数字字面量
    if (this.peek().type === 'number') {
      const numStr = this.consume('number').value;
      return { type: 'NumberLiteral', value: Number(numStr) };
    }

    throw new Error(`Unexpected token in expression: ${this.peek().type}`);
  }

  private getDefaultAlias(expr: Expr): string {
    if (expr.type === 'Identifier') return expr.name;
    if (expr.type === 'FunctionCall') {
      const argsStr = expr.args.map(a => this.formatExprArg(a)).join(', ');
      return `${expr.name}(${argsStr})`;
    }
    if (expr.type === 'GlobalVariable') return expr.name;
    if (expr.type === 'Star') return '*';
    if (expr.type === 'QualifiedStar') return `${expr.table}.*`;
    return 'expr';
  }

  private formatExprArg(a: Expr): string {
    switch (a.type) {
      case 'StringLiteral':
        return `'${a.value}'`;
      case 'NumberLiteral':
        return String(a.value);
      case 'Identifier':
        return a.name;
      case 'FunctionCall':
        return `${a.name}(${a.args.map(x => this.formatExprArg(x)).join(', ')})`;
      case 'GlobalVariable':
        return a.name;
      case 'Star':
        return '*';
      case 'QualifiedStar':
        return `${a.table}.*`;
    }
  }

  private parseAlias(): string {
    if (this.peek().type === 'backtick') {
      const raw = this.consume('backtick').value;
      return raw.slice(1, -1);
    }
    if (this.peek().type === 'ident') {
      return this.consume('ident').value;
    }
    throw new Error(i18n.global.t('core.sql.expected_alias'));
  }

  private parseFieldName(): string {
    if (this.peek().type === 'backtick') {
      const raw = this.consume('backtick').value;
      return raw.slice(1, -1);
    }
    if (this.peek().type === 'ident') {
      return this.consume('ident').value;
    }
    throw new Error(i18n.global.t('core.sql.expected_field'));
  }

  private parseTableName(): string {
    return this.parseFieldName(); // same as field name
  }

  // ========================
  // 条件解析（核心：支持 AND/OR/括号）
  // ========================
  private parseCondition(): Condition {
    return this.parseLogicalOr();
  }

  private parseLogicalOr(): Condition {
    let left = this.parseLogicalAnd();
    while (this.peek().type === 'or') {
      this.consume('or');
      const right = this.parseLogicalAnd();
      left = { type: 'LogicalOp', op: 'OR', left, right };
    }
    return left;
  }

  private parseLogicalAnd(): Condition {
    let left = this.parseComparison();
    while (this.peek().type === 'and') {
      this.consume('and');
      const right = this.parseComparison();
      left = { type: 'LogicalOp', op: 'AND', left, right };
    }
    return left;
  }

  private parseComparison(): Condition {
    // 处理括号 ( ... )
    if (this.peek().type === 'lparen') {
      this.consume('lparen');
      const cond = this.parseCondition();
      this.consume('rparen');
      return { type: 'Paren', condition: cond };
    }

    const expr = this.parseExpr();

    // IS [NOT] NULL
    if (this.isKeyword('IS')) {
      this.consumeKeyword('IS');
      const not = this.isKeyword('NOT');
      if (not) this.consumeKeyword('NOT');
      this.consumeKeyword('NULL');
      return { type: 'IsNull', expr, not };
    }

    // LIKE
    if (this.isKeyword('LIKE')) {
      this.consumeKeyword('LIKE');
      const patternToken = this.consume('string');
      const pattern = patternToken.value.slice(1, -1);
      return { type: 'Like', expr, pattern };
    }

    // 操作符: =, !=, <, <=, >, >=, TERM, MATCH
    const opToken = this.peek();
    const opMap: Record<string, string> = {
      eq: '=',
      neq: '!=',
      lt: '<',
      lte: '<=',
      gt: '>',
      gte: '>=',
      term: 'TERM',
      match: 'MATCH',
    };

    let t = opToken.type as keyof typeof opMap | undefined;
    if (t && opMap[t]) {
      this.consume(t as string);
      const right = this.parseExpr();
      return { type: 'BinaryOp', op: opMap[t], left: expr, right };
    }
    if (opToken.type === 'ident') {
      const v = String(opToken.value).toUpperCase();
      if (v === 'TERM' || v === 'MATCH') {
        this.consume('ident');
        const right = this.parseExpr();
        return { type: 'BinaryOp', op: v, left: expr, right };
      }
    }

    throw new Error(i18n.global.t('core.sql.expected_operator', {got: opToken.type}));
  }
}

// ========================
// 4. 使用示例 & DSL 生成（简化版）
// ========================
export function parseSQL(sql: string): Query {
  const parser = new SQLParser(sql);
  return parser.parse();
}

// 示例：将 WHERE 条件转为 ES bool 查询（简化）
export function conditionToES(cond: Condition): any {
  switch (cond.type) {
    case 'LogicalOp':
      if (cond.op === 'AND') {
        return {
          bool: {
            must: [conditionToES(cond.left), conditionToES(cond.right)],
          },
        };
      } else {
        return {
          bool: {
            should: [conditionToES(cond.left), conditionToES(cond.right)],
            minimum_should_match: 1,
          },
        };
      }

    case 'Paren':
      return conditionToES(cond.condition);

    case 'BinaryOp':
      const field = getIdentifierName(cond.left);
      const value = getComparableValue(cond.right);
      if (cond.op === '=' || cond.op === 'TERM') {
        return { term: { [field]: value } };
      } else if (cond.op === 'MATCH') {
        return { match: { [field]: value } };
      } else if (cond.op === '!=') {
        return { bool: { must_not: { term: { [field]: value } } } };
      } else if (cond.op === '<') {
        return { range: { [field]: { lt: value } } };
      } else if (cond.op === '<=') {
        return { range: { [field]: { lte: value } } };
      } else if (cond.op === '>') {
        return { range: { [field]: { gt: value } } };
      } else if (cond.op === '>=') {
        return { range: { [field]: { gte: value } } };
      }
      // 其他操作符可扩展
      throw new Error(i18n.global.t('core.sql.unsupported_op', {op: cond.op}));

    case 'IsNull':
      const nullField = getIdentifierName(cond.expr);
      if (cond.not) {
        return { exists: { field: nullField } };
      } else {
        return { bool: { must_not: { exists: { field: nullField } } } };
      }

    case 'Like':
      return { wildcard: { [getIdentifierName(cond.expr)]: cond.pattern.replace(/%/g, '*') } };

    default:
      throw new Error(i18n.global.t('core.sql.unknown_condition'));
  }
}

function getIdentifierName(expr: Expr): string {
  if (expr.type === 'Identifier') return expr.name;
  throw new Error(i18n.global.t('core.sql.field_must_be_ident'));
}

function getComparableValue(expr: Expr): string | number {
  switch (expr.type) {
    case 'StringLiteral':
      return expr.value;
    case 'NumberLiteral':
      return expr.value;
    case 'Identifier':
      return expr.name;
    default:
      throw new Error(i18n.global.t('core.sql.right_value_must_be_lit'));
  }
}
