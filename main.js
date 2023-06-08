fetch('data.json')
    .then((resp) => resp.json())
    .then((json) => {
        // console.log(typeof json.sheets)
        const submissionUrl = json.submissionUrl
        const sheets = json.sheets
        processSheets(sheets, submissionUrl)
    })


function processSheets(sheets, submissionUrl) {
    for (const sheet of sheets) {
        const rows = sheet.data
        keyValueArray = mapSheetDataToArray(rows)

        for (const key in keyValueArray) {
            const value = keyValueArray[key]

            if (typeof value === 'string' && value.startsWith('=')) {
                const evaluatedValue = evaluateCellValue(value, keyValueArray)
                keyValueArray[key] = evaluatedValue;
            }
        }

        // for (const row in rows) {
        //     // const rowData = [];
        //     value = rows[row]
        //     // console.log(value)
        //     for (const cell in value) {
        //         cellValue = value[cell]
        //         // console.log(cellValue)
        //         if (typeof cellValue === 'string' && cellValue.startsWith('=')) {
        //             const evaluatedValue = evaluateCellValue(cellValue, keyValueArray)
        //             // rowData.push(cell)

        //         }
        //     }
        //     // sheetData.push(rowData)
        // }
        // console.log(rows)
        // console.log('sheetData ' + sheetData)

    }


    function mapSheetDataToArray(rows) {
        const keyValueArray = {}

        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const row = rows[rowIndex];
            const columnLetters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
            const rowNumber = rowIndex + 1

            for (let cellIndex = 0; cellIndex < row.length; cellIndex++) {
                const cell = row[cellIndex]
                const column = columnLetters[cellIndex]
                const rowKey = `${column}${rowNumber}`

                keyValueArray[rowKey] = cell
            }
        }
        return keyValueArray
    }

    function evaluateCellValue(value, keyValueArray) {
        // console.log('evaluateCellValue ' + value)

        if (typeof value === 'string' && value.startsWith('=')) {
            const expression = value.slice(1)
            const partsOfExpression = expression.split(/[\s,()]+/).filter(Boolean);
            const operator = partsOfExpression[0]
            const expressionValues = partsOfExpression.slice(1);
            // console.log(partsOfExpression)

            switch (operator) {
                case 'SUM':
                    let sum = 0
                    for (const key of expressionValues) {
                        // console.log(keyValueArray[key])
                        // console.log(isNaN(keyValueArray[key])) 
                        if (!isNaN(key)) {
                            sum += Number(key)
                        } else if (keyValueArray[key] && !isNaN(keyValueArray[key])) {
                            sum += Number(keyValueArray[key])
                        } else {
                            return '#ERROR: Invalid or non-numeric value';
                        }
                    }
                    // console.log('sum ' + sum)
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
                            // console.log('error')
                            return '#ERROR: Invalid or non-numeric value';
                        }
                    }
                    // console.log('result ' + multiply)
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
                                    const divide = newValue1 / newValue2;
                                    // console.log(divide)
                                    return divide
                                } else {
                                    return '#ERROR: Division by zero is not allowed';
                                }
                            } else {
                                return '#ERROR: Invalid or non-numeric value';
                            }
                        } else {
                            return '#ERROR: Invalid value';
                        }
                    }

                case 'GT':
                    // Returns true if the first operand is greater than the second operand.
                    if (expressionValues.length === 2) {
                        const value1 = expressionValues[0]
                        const value2 = expressionValues[1]
                        if (keyValueArray[value1] && keyValueArray[value2]) {
                            const newValue1 = keyValueArray[value1]
                            const newValue2 = keyValueArray[value2]

                            if (!isNaN(newValue1) && !isNaN(newValue2)) {
                                const greater = newValue1 > newValue2 ? true : false
                                // console.log(greater)
                                return greater
                            }
                        }
                    }

                case 'EQ':
                    // Returns true if the first operand is equal to the second operand.
                    if (expressionValues.length === 2) {
                        const value1 = expressionValues[0]
                        const value2 = expressionValues[1]
                        if (keyValueArray[value1] && keyValueArray[value2]) {
                            const newValue1 = keyValueArray[value1]
                            const newValue2 = keyValueArray[value2]

                            if (!isNaN(newValue1) && !isNaN(newValue2)) {
                                const equal = newValue1 === newValue2 ? true : false
                                // console.log(equal)
                                return equal;
                            }
                        }
                    }

                case 'NOT':
                    // Negates a boolean value. “=NOT(true)”
                    if (expressionValues.length === 1) {
                        const value = expressionValues[0]
                        // console.log(typeof (keyValueArray[value]))
                        if (keyValueArray[value] !== undefined && typeof keyValueArray[value] === 'boolean') {
                            // console.log(!keyValueArray[value])
                            return !keyValueArray[value]
                        }
                    }
                    break;

                case 'AND':
                    // Logical and operation. True if all parameters are true.
                    const resultAnd = expressionValues.reduce((previous, current) => {
                        // console.log(current)
                        let value = evaluateCellValue(current, keyValueArray);
                        value = keyValueArray[value]
                        if (typeof value !== 'boolean') {
                            return '#ERROR: Incompatible types';
                        }
                        return previous && value;
                    }, true);
                    // console.log(result)
                    return resultAnd


                case 'OR':
                    // Logical or operation. True if at least one parameter is true.
                    const resultOr = expressionValues.reduce((previous, current) => {
                        // console.log(current)
                        let value = evaluateCellValue(current, keyValueArray);
                        value = keyValueArray[value]
                        if (typeof value !== 'boolean') {
                            return '#ERROR: Incompatible types';
                        }
                        return previous || value;
                    }, false);
                    // console.log('result >>> ' + resultOr)
                    return resultOr

                case 'IF':
                    // Conditional.Arguments:
                    // 1 - condition.Must be a boolean. 2 - value if condition is true.
                    // 3 - value if condition is false.



                // default:
                //     if (keyValueArray[operator]) {
                //         return keyValueArray[operator]
                //     }
            }

        }
        // console.log('return value: ' + value)
        return value
    }
}

