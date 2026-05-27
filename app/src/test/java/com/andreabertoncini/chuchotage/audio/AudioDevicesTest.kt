package com.andreabertoncini.chuchotage.audio

import android.media.AudioDeviceInfo
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AudioDevicesTest {
    @Test
    fun recognizesCommonHeadsetPlaybackTypes() {
        assertTrue(AudioDevices.isHeadsetPlaybackType(AudioDeviceInfo.TYPE_WIRED_HEADPHONES))
        assertTrue(AudioDevices.isHeadsetPlaybackType(AudioDeviceInfo.TYPE_WIRED_HEADSET))
        assertTrue(AudioDevices.isHeadsetPlaybackType(AudioDeviceInfo.TYPE_USB_HEADSET))
        assertTrue(AudioDevices.isHeadsetPlaybackType(AudioDeviceInfo.TYPE_BLUETOOTH_A2DP))
        assertTrue(AudioDevices.isHeadsetPlaybackType(AudioDeviceInfo.TYPE_BLUETOOTH_SCO))
    }

    @Test
    fun doesNotTreatBuiltInSpeakerAsHeadsetPlayback() {
        assertFalse(AudioDevices.isHeadsetPlaybackType(AudioDeviceInfo.TYPE_BUILTIN_SPEAKER))
    }

    @Test
    fun recognizesHeadphonesAndEarbudsPlaybackTypes() {
        assertTrue(AudioDevices.isHeadphonesOrEarbudsPlaybackType(AudioDeviceInfo.TYPE_WIRED_HEADPHONES))
        assertTrue(AudioDevices.isHeadphonesOrEarbudsPlaybackType(AudioDeviceInfo.TYPE_WIRED_HEADSET))
        assertTrue(AudioDevices.isHeadphonesOrEarbudsPlaybackType(AudioDeviceInfo.TYPE_USB_HEADSET))
        assertTrue(AudioDevices.isHeadphonesOrEarbudsPlaybackType(AudioDeviceInfo.TYPE_BLUETOOTH_A2DP))
        assertTrue(AudioDevices.isHeadphonesOrEarbudsPlaybackType(AudioDeviceInfo.TYPE_BLUETOOTH_SCO))
    }

    @Test
    fun doesNotTreatGenericUsbAudioAsHeadphonesOrEarbuds() {
        assertFalse(AudioDevices.isHeadphonesOrEarbudsPlaybackType(AudioDeviceInfo.TYPE_USB_DEVICE))
    }

    @Test
    fun recognizesPhoneSpeakerPlaybackType() {
        assertTrue(AudioDevices.isPhoneSpeakerPlaybackType(AudioDeviceInfo.TYPE_BUILTIN_SPEAKER))
        assertFalse(AudioDevices.isPhoneSpeakerPlaybackType(AudioDeviceInfo.TYPE_WIRED_HEADPHONES))
    }

    @Test
    fun recognizesCommonHeadsetInputTypes() {
        assertTrue(AudioDevices.isHeadsetInputType(AudioDeviceInfo.TYPE_WIRED_HEADSET))
        assertTrue(AudioDevices.isHeadsetInputType(AudioDeviceInfo.TYPE_USB_HEADSET))
        assertTrue(AudioDevices.isHeadsetInputType(AudioDeviceInfo.TYPE_BLUETOOTH_SCO))
    }

    @Test
    fun doesNotTreatBuiltInMicrophoneAsHeadsetInput() {
        assertFalse(AudioDevices.isHeadsetInputType(AudioDeviceInfo.TYPE_BUILTIN_MIC))
    }

    @Test
    fun matchesBluetoothHeadsetInputToBluetoothCommunicationRoute() {
        assertTrue(
            AudioDevices.isMatchingHeadsetRoute(
                AudioDeviceInfo.TYPE_BLUETOOTH_SCO,
                AudioDeviceInfo.TYPE_BLUETOOTH_SCO,
            ),
        )
        assertFalse(
            AudioDevices.isMatchingHeadsetRoute(
                AudioDeviceInfo.TYPE_BLUETOOTH_SCO,
                AudioDeviceInfo.TYPE_BUILTIN_SPEAKER,
            ),
        )
    }

    @Test
    fun matchesGenericUsbInputToUsbHeadsetRoute() {
        assertTrue(
            AudioDevices.isMatchingHeadsetRoute(
                AudioDeviceInfo.TYPE_USB_DEVICE,
                AudioDeviceInfo.TYPE_USB_HEADSET,
            ),
        )
    }

    @Test
    fun doesNotMatchUsbInputToBuiltInMicrophoneRoute() {
        assertFalse(
            AudioDevices.isMatchingHeadsetRoute(
                AudioDeviceInfo.TYPE_USB_DEVICE,
                AudioDeviceInfo.TYPE_BUILTIN_MIC,
            ),
        )
    }
}
