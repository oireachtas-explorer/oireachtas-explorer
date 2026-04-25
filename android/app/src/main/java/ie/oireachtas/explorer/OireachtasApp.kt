package ie.oireachtas.explorer

import android.app.Application
import ie.oireachtas.explorer.data.api.OireachtasService

class OireachtasApp : Application() {
    override fun onCreate() {
        super.onCreate()
        OireachtasService.init(this)
    }
}
