import { redirect } from "@sveltejs/kit"
import type { Actions, PageServerLoad } from "./$types"
import { error } from "@sveltejs/kit"

export const load: PageServerLoad = async ({ cookies }) => {
  const user = await authenticateUser(cookies)
	return {user}
}

export const actions: Actions = {
	change_password: async (event) => {
    console.log("Changin password")
		const data = await event.request.formData()
 		const res = await event.fetch('/api/user/change_pw',
	    		{method: 'POST',
			body: JSON.stringify({
        username:     data.get('username'),
				new_password: data.get('new_password'),
				new_password_rep: data.get('new_password_rep'),
				old_password: data.get('old_password'),
			}),
      headers: {
        credentials: 'include',
      }
			})
    if(res.ok){
      console.log("OK response")
    }
    else{
      const item = await res.json()
      throw error(401, item.message) 
    }
  }
}
