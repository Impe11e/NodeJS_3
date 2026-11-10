export class SqlQuery {
    readonly text: string;

    constructor(
        readonly parts: readonly string[],
        readonly values: unknown[]
    ) {
        this.text = parts.reduce((text, part, index) => `${text}$${index}${part}`);
    }
}

function sqlTemplate(strings: TemplateStringsArray, ...values: unknown[]): SqlQuery {
    const parts: string[] = [strings[0]];
    const flatValues: unknown[] = [];

    values.forEach((value, index) => {
        const nextString = strings[index + 1];
        if (value instanceof SqlQuery) {
            parts[parts.length - 1] += value.parts[0];
            parts.push(...value.parts.slice(1));
            flatValues.push(...value.values);
            parts[parts.length - 1] += nextString;
        } else {
            flatValues.push(value);
            parts.push(nextString);
        }
    });

    return new SqlQuery(parts, flatValues);
}

function raw(text: string): SqlQuery {
    return new SqlQuery([text], []);
}

export const sql = Object.assign(sqlTemplate, { raw });
