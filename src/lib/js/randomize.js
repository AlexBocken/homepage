const MS_PER_DAY = 86400000

/**
 * @param {number} a
 */
function mulberry32(a) {
	return function() {
	  var t = a += 0x6D2B79F5;
	  t = Math.imul(t ^ t >>> 15, t | 1);
	  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
	  return ((t ^ t >>> 14) >>> 0) / 4294967296;
	}
}

/**
 * @template T
 * @param {T[]} array
 * @returns {T[]}
 */
export function rand_array(array){
	let time = new Date()
	const seed = Math.floor(time.getTime()/MS_PER_DAY)
	let rand = mulberry32(seed)
	// Create a copy to avoid mutating the original array
	return [...array].sort((a,b) => 0.5 - rand())
}
