import parse_loose_json from 'loose-json'
import { readFileSync, existsSync } from 'fs'

/*
 * JSON might be provided as a string, file, or stdin
 * case: string - try to parse it
 * case: file - try to load it and parse it
 * case: stdin - try to load it from stdin and parse it
*/
function uplift_json(data, options?, scope?) {
    if (!data?.json) return data

    // Handle JSON as JSON, from file, or from stdin

    // CASE: JSON value is '-', which we will take to be stdin.
    if (data.json === '-') {
        try {
            data.json = parse_loose_json( readFileSync('/dev/stdin', 'utf8').toString() )
            return data
        } catch (exception) {
            console.error( 'ERROR READING JSON FROM STDIN' )
            console.error( 'EXCEPTION IS', exception )
        }
    }

    // CASE: JSON value is filename. We try to read filename, and convert to JSON
    const potential_filepath = data.json
    if ( existsSync( potential_filepath ) ) {
        try {
            data.json = parse_loose_json( readFileSync( potential_filepath, 'utf8').toString() )
            return data
        } catch ( exception ) {
            console.error( 'ERROR READING JSON FROM FILEPATH', potential_filepath )
            console.error( 'EXCEPTION IS', exception )
        }
    }

    // Case: JSON value is serialized JSON. We convert string to JSON
    try {
        data.json = parse_loose_json( data.json )
        return data
    } catch (exception) {
        console.error( 'ERROR PARSING PROVIDED JSON', data.json )
        console.error( 'EXCEPTION IS', exception )
    }

    // CASE: JSON is not valid
    console.error( "WARNING JSON PARAMETER IS INVALID", data.json )
    throw "INVALID_JSON_PARAMETER"
}


/*
 * Pass in data, and it will be uplifited to the best possible form
 */
export function uplift (data, options?, scope?) {
    // Uplifts - where configuration parameters are evolved to their best possible form
    const uplifts = [
        uplift_json
    ]

    uplifts.forEach(uplift => {
        data = uplift(data, options, scope)
    })
    
    return data
}

