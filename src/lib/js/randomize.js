const time = new Date()
const MS_PER_DAY = 86400000
let seed = Math.floor(time.getTime()/MS_PER_DAY)
function mulberry32(a) {
	return function() {
	  var t = a += 0x6D2B79F5;
	  t = Math.imul(t ^ t >>> 15, t | 1);
	  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
	  return ((t ^ t >>> 14) >>> 0) / 4294967296;
	}
}
let rand = mulberry32(seed)

export function rand_array(array){
	array.sort((a,b) => 0.5 - rand())
	return array
}
