package com.andreabertoncini.chuchotage.audio

import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import com.andreabertoncini.chuchotage.settings.AudioOutputRoute

object AudioDevices {
    fun isHeadsetInputAvailable(context: Context): Boolean {
        val audioManager = context.getSystemService(AudioManager::class.java) ?: return false
        return isHeadsetInputAvailable(audioManager)
    }

    fun isHeadsetInputAvailable(audioManager: AudioManager): Boolean {
        return inputDevices(audioManager).any { isHeadsetInputType(it.type) }
    }

    fun isHeadsetPlaybackAvailable(context: Context): Boolean {
        val audioManager = context.getSystemService(AudioManager::class.java) ?: return false
        return isHeadsetPlaybackAvailable(audioManager)
    }

    fun isHeadsetPlaybackAvailable(audioManager: AudioManager): Boolean {
        return hasHeadphonesOrEarbudsPlaybackDevice(audioManager)
    }

    fun hasHeadphonesOrEarbudsPlaybackDevice(audioManager: AudioManager?): Boolean {
        return outputDevices(audioManager).any { isHeadphonesOrEarbudsPlaybackType(it.type) }
    }

    fun isHeadsetPlaybackType(deviceType: Int): Boolean = deviceType in headsetPlaybackDeviceTypes()

    fun isHeadphonesOrEarbudsPlaybackType(deviceType: Int): Boolean {
        return deviceType in headphonesOrEarbudsPlaybackDeviceTypes()
    }

    fun isPhoneSpeakerPlaybackType(deviceType: Int): Boolean {
        return deviceType == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER ||
            (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && deviceType == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER_SAFE)
    }

    fun preferredOutputDevice(audioManager: AudioManager?, audioOutputRoute: AudioOutputRoute): AudioDeviceInfo? {
        if (audioOutputRoute == AudioOutputRoute.SystemDefault) {
            return null
        }

        val devices = outputDevices(audioManager)

        return when (audioOutputRoute) {
            AudioOutputRoute.PhoneSpeaker -> devices.firstOrNull {
                isPhoneSpeakerPlaybackType(it.type)
            }
            AudioOutputRoute.Headphones -> devices.firstOrNull {
                isHeadphonesOrEarbudsPlaybackType(it.type)
            }
            AudioOutputRoute.SystemDefault -> null
        }
    }

    private fun outputDevices(audioManager: AudioManager?): List<AudioDeviceInfo> {
        return try {
            audioManager?.getDevices(AudioManager.GET_DEVICES_OUTPUTS)?.toList().orEmpty()
        } catch (securityException: SecurityException) {
            emptyList()
        }
    }

    fun isHeadsetInputType(deviceType: Int): Boolean = deviceType in headsetInputDeviceTypes()

    private fun inputDevices(audioManager: AudioManager?): List<AudioDeviceInfo> {
        return try {
            audioManager?.getDevices(AudioManager.GET_DEVICES_INPUTS)?.toList().orEmpty()
        } catch (securityException: SecurityException) {
            emptyList()
        }
    }

    fun isBluetoothHeadsetType(deviceType: Int): Boolean {
        return deviceType == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
            (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && deviceType == AudioDeviceInfo.TYPE_BLE_HEADSET)
    }

    fun isMatchingHeadsetRoute(inputType: Int, communicationType: Int): Boolean {
        return inputType == communicationType ||
            (isBluetoothHeadsetType(inputType) && isBluetoothHeadsetType(communicationType)) ||
            (isUsbHeadsetType(inputType) && isUsbHeadsetType(communicationType))
    }

    private fun isUsbHeadsetType(deviceType: Int): Boolean {
        return deviceType == AudioDeviceInfo.TYPE_USB_HEADSET ||
            deviceType == AudioDeviceInfo.TYPE_USB_DEVICE
    }

    fun headsetInputDeviceTypes(): Set<Int> {
        return buildSet {
            add(AudioDeviceInfo.TYPE_WIRED_HEADSET)
            add(AudioDeviceInfo.TYPE_USB_HEADSET)
            add(AudioDeviceInfo.TYPE_USB_DEVICE)
            add(AudioDeviceInfo.TYPE_BLUETOOTH_SCO)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                add(AudioDeviceInfo.TYPE_BLE_HEADSET)
            }
        }
    }

    private fun headsetPlaybackDeviceTypes(): Set<Int> {
        return buildSet {
            add(AudioDeviceInfo.TYPE_WIRED_HEADPHONES)
            add(AudioDeviceInfo.TYPE_WIRED_HEADSET)
            add(AudioDeviceInfo.TYPE_USB_HEADSET)
            add(AudioDeviceInfo.TYPE_USB_DEVICE)
            add(AudioDeviceInfo.TYPE_BLUETOOTH_A2DP)
            add(AudioDeviceInfo.TYPE_BLUETOOTH_SCO)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                add(AudioDeviceInfo.TYPE_HEARING_AID)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                add(AudioDeviceInfo.TYPE_BLE_HEADSET)
            }
        }
    }

    private fun headphonesOrEarbudsPlaybackDeviceTypes(): Set<Int> {
        return buildSet {
            add(AudioDeviceInfo.TYPE_WIRED_HEADPHONES)
            add(AudioDeviceInfo.TYPE_WIRED_HEADSET)
            add(AudioDeviceInfo.TYPE_USB_HEADSET)
            add(AudioDeviceInfo.TYPE_BLUETOOTH_A2DP)
            add(AudioDeviceInfo.TYPE_BLUETOOTH_SCO)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                add(AudioDeviceInfo.TYPE_HEARING_AID)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                add(AudioDeviceInfo.TYPE_BLE_HEADSET)
            }
        }
    }
}
