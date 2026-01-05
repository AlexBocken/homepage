/**
 * @param {KeyboardEvent} event
 * @param {string} key
 * @param {boolean} needsctrl
 * @param {() => void} fn
 */
export function do_on_key(event, key, needsctrl, fn){
	if(event.key == key){
		if(needsctrl && !event.ctrlKey){
			return
		}
		fn()
	}
}
