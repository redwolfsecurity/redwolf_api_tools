
/*
Project takes an object, and a projection, and returns only the projected fields.
e.g.
const object = { a: 1, b: 2, c: 3}
const projection = { a: true, c: true, d: true }

return would be { a: 1, c: 3 }

*/
export function project(object, projection) {
	if ( !object ) {
		return
	}

	if (!projection) {
		return object
	}

	let output
	// If array, project over the elements of the array
	if ( Array.isArray( object ) ) {
		output = []
		for ( const item of object ) {
			output.push( project( item, projection ))
		}
		// output = object.map( ( item ) => { return project( item, projection ) } )
	} else {
		output = project_object( object, projection )
	}

	return output
}

function project_object ( object, projection ) {
	let projected_object = {}
	for (let key in projection) {
		projected_object[key] = object[key]
	}
	return projected_object
}