const code = fetch("https://www.wix.com/_serverless/hiring-task-spreadsheet-evaluator/sheets")
    .then((resp) => {
        return resp.json();
    })
    .then((json) => {
        const submissionUrl = json.submissionUrl
        const sheets = json.sheets
        return processSheets(sheets, submissionUrl);
    })
    .then((data) => {
        console.log(data)
        const results = data.results
        const url = data.submissionUrl

        fetch(url, {
            method: 'POST',
            headers: {
                'Accept': "application/json",
                'Content-Type': "application/json"
            },
            body: JSON.stringify(results),
            mode: 'no-cors'
        })
            .then((resp) => {
                if (!resp.ok) {
                    throw new Error('Network response was not ok');
                }
                console.log('POST request successful');
            })
            .catch((error) => {
                console.error('Error occurred during POST request:', error);
            });
    })

function processSheets(sheets, submissionUrl) {

    const allSheetResults = {
        email: 'brigita.grybaite@gmail.com',
        results: []
    }

    const all = {
        results: allSheetResults,
        submissionUrl: submissionUrl
    }

    for (const sheet of sheets) {
        const sheetData = { id: sheet.id, data: [] };
        const rows = sheet.data
        const keyValueArray = mapSheetDataToArray(rows)

        for (const row of rows) {
            const rowData = []
            for (const cell of row) {
                if (typeof cell === 'string' && cell.startsWith('=')) {
                    const evaluatedValue = evaluateCellValue(cell, keyValueArray);
                    rowData.push(evaluatedValue);
                } else {
                    rowData.push(cell);
                }
            }
            sheetData.data.push(rowData)
        }

        allSheetResults.results.push(sheetData)
    }

    return all

}

function mapSheetDataToArray(rows) {
    const keyValueArray = {}

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex]
        const columnLetters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))
        const rowNumber = rowIndex + 1

        if (rowIndex === 0 && row[0] === 'First') {
            for (let cellIndex = 0; cellIndex < row.length; cellIndex++) {
                const cell = row[cellIndex]
                const column = columnLetters[cellIndex]
                const rowKey = `${column}${rowNumber}`
                keyValueArray[rowKey] = cell

                if (typeof cell === 'string' && cell.startsWith('=')) {
                    const nextCellIndex = cellIndex - 1;
                    const nextCellColumn = columnLetters[nextCellIndex];
                    const nextCellRowKey = `${nextCellColumn}${rowNumber}`;
                    const nextCellValue = keyValueArray[nextCellRowKey];
                    keyValueArray[rowKey] = nextCellValue;
                }
            }
        } else if (rowIndex === rows.length - 1 && row[row.length - 1] === 'Last') {
            const lastIndex = row.length - 1
            for (let i = lastIndex - 1; i >= 0; i--) {
                row[i] = row[i + 1]
            }

            for (let cellIndex = 0; cellIndex < row.length; cellIndex++) {
                const cell = row[cellIndex]
                const column = columnLetters[cellIndex]
                const rowKey = `${column}${rowNumber}`
                keyValueArray[rowKey] = cell
            }
        } else {
            for (let cellIndex = 0; cellIndex < row.length; cellIndex++) {
                const cell = row[cellIndex]
                const column = columnLetters[cellIndex]
                const rowKey = `${column}${rowNumber}`


                if (typeof cell === 'string' && cell.startsWith('=')) {
                    const previousRowNumber = rowNumber - 1;
                    const previousRowKey = `${column}${previousRowNumber}`;
                    const previousRowValue = keyValueArray[previousRowKey];
                    keyValueArray[rowKey] = previousRowValue;

                } else {
                    keyValueArray[rowKey] = cell;
                }
            }
        }
    }

    return keyValueArray
}

function evaluateCellValue(value, keyValueArray) {
    if (typeof value === 'string' && value.startsWith('=')) {
        const expression = value.slice(1)
        const partsOfExpression = expression.split(/[\s,()]+/).filter(Boolean)
        const operator = partsOfExpression[0]
        const expressionValues = partsOfExpression.slice(1)

        switch (operator) {
            case 'SUM':
                let sum = 0
                for (const key of expressionValues) {
                    if (!isNaN(key)) {
                        sum += Number(key)
                    } else if (keyValueArray[key] && !isNaN(keyValueArray[key])) {
                        sum += Number(keyValueArray[key])
                    } else {
                        return '#ERROR: Invalid or non-numeric value'
                    }
                }
                return sum

            case 'MULTIPLY':
                let multiply = 1
                for (let key of expressionValues) {
                    if (!isNaN(key)) {
                        key = 1
                        multiply *= Number(key)
                    } else if (keyValueArray[key] && !isNaN(keyValueArray[key])) {
                        multiply *= Number(keyValueArray[key])
                    } else {
                        return '#ERROR: Invalid or non-numeric value'
                    }
                }
                return multiply;

            case 'DIVIDE':
                if (expressionValues.length === 2) {
                    const value1 = expressionValues[0]
                    const value2 = expressionValues[1]

                    if (keyValueArray[value1] && keyValueArray[value2]) {
                        const newValue1 = keyValueArray[value1]
                        const newValue2 = keyValueArray[value2]

                        if (!isNaN(newValue1) && !isNaN(newValue2)) {
                            if (Math.abs(newValue2) > 1e-7) {
                                const divide = newValue1 / newValue2
                                return divide
                            } else {
                                return '#ERROR: Division by zero is not allowed'
                            }
                        } else {
                            return '#ERROR: Invalid or non-numeric value'
                        }
                    } else {
                        return '#ERROR: Invalid value'
                    }
                }

            case 'GT':
                if (expressionValues.length === 2) {
                    const value1 = expressionValues[0]
                    const value2 = expressionValues[1]
                    if (keyValueArray[value1] && keyValueArray[value2]) {
                        const newValue1 = keyValueArray[value1]
                        const newValue2 = keyValueArray[value2]

                        if (!isNaN(newValue1) && !isNaN(newValue2)) {
                            const greater = newValue1 > newValue2 ? true : false
                            return greater
                        }
                    }
                }

            case 'EQ':
                if (expressionValues.length === 2) {
                    const value1 = expressionValues[0]
                    const value2 = expressionValues[1]
                    if (keyValueArray[value1] && keyValueArray[value2]) {
                        const newValue1 = keyValueArray[value1]
                        const newValue2 = keyValueArray[value2]

                        if (!isNaN(newValue1) && !isNaN(newValue2)) {
                            const equal = newValue1 === newValue2 ? true : false
                            return equal
                        }
                    }
                }

            case 'NOT':
                if (expressionValues.length === 1) {
                    const value = expressionValues[0]
                    if (keyValueArray[value] !== undefined && typeof keyValueArray[value] === 'boolean') {
                        return !keyValueArray[value]
                    }
                }
                break

            case 'AND':
                const resultAnd = expressionValues.reduce((previous, current) => {
                    let value = evaluateCellValue(current, keyValueArray)
                    value = keyValueArray[value]
                    if (typeof value !== 'boolean') {
                        return '#ERROR: Incompatible types'
                    }
                    return previous && value
                }, true)
                return resultAnd


            case 'OR':
                const resultOr = expressionValues.reduce((previous, current) => {
                    let value = evaluateCellValue(current, keyValueArray)
                    value = keyValueArray[value]
                    if (typeof value !== 'boolean') {
                        return '#ERROR: Incompatible types'
                    }
                    return previous || value
                }, false)
                return resultOr

            case 'IF':
                const regex = /(IF\(|[A-Z]+\([^)]+\)|[A-Z0-9]+)/g;
                let newExpression = expression.match(regex)

                newExpression[0] = newExpression[0].replace('(', '')
                newExpression = newExpression.slice(1)

                const condition = evaluateCellValue('=' + newExpression[0], keyValueArray)
                const valueIfTrue = evaluateCellValue('=' + newExpression[1], keyValueArray)
                const valueIfFalse = evaluateCellValue('=' + newExpression[2], keyValueArray)

                if (typeof condition === 'boolean') {
                    const resultIf = condition ? valueIfTrue : valueIfFalse
                    return resultIf
                } else {
                    return '#ERROR: Invalid condition'
                }

            case 'CONCAT':
                const pattern = /[A-Z]+\d+|"(.*?)"/g;
                const newExpressionArray = expression.match(pattern) || [];
                let concatenatedString = ''

                for (const value of newExpressionArray) {
                    if (value.startsWith('"') && value.endsWith('"')) {
                        concatenatedString += value.slice(1, -1)
                    }
                    else {
                        concatenatedString += keyValueArray[value]
                    }
                }
                return concatenatedString

            default:
                if (keyValueArray[operator]) {
                    return keyValueArray[operator]
                }
        }
    }
    return value
}
