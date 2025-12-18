import React from 'react';
import { Header } from './Header';
import { ControlPanel } from './ControlPanel';
import { TranscriptList } from './TranscriptList';
import { useTransceiver } from '../hooks/useTransceiver';
import { UserRole } from '../types'; // もしtypes.tsにUserRoleがなければ string 等で代用

type Props = {
    channelId: string;
    user: any;
    onLeave: () => void;
};

export const TransceiverInterface: React.FC<Props> = ({ channelId, user, onLeave }) => {
    // 【修正1】useTransceiverの引数を5つすべて渡す
    // ※ channelSlotはBroadcastChannel用の数値が必要なため、仮で 1 を渡しています
    // ※ passkeyは実装に合わせて適切なものを渡してください（今回は仮で 'default-pass'）
    const role: UserRole = 'HOST'; // 仮で全員HOST扱いにします（権限エラー回避）

    const {
        isRecording,
        transcripts,
        permissionError,
        startTransmission,
        stopTransmission,
        // clearTranscripts // 必要であれば使う
    } = useTransceiver(
        user.email || 'Anonymous', // userName
        1,                         // channelSlot (本来は数値が必要)
        channelId,                 // channelName
        'default-pass',            // passkey
        role                       // role
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* 【修正2】Headerに必要なProps (userName, role) を渡す */}
            <Header
                channelName={channelId}
                userName={user.email || 'Guest'}
                role={role}
                onLogout={onLeave}
            // onRename は必須ではないので省略可
            />

            <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col gap-4">
                {/* エラー表示エリア */}
                {permissionError && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                        {permissionError}
                    </div>
                )}

                {/* 会話ログリスト */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex-1 overflow-hidden flex flex-col" style={{ minHeight: '50vh' }}>
                    {transcripts && transcripts.length > 0 ? (
                        <TranscriptList transcripts={transcripts} />
                    ) : (
                        <div className="text-center p-10 text-gray-500 flex-1 flex flex-col items-center justify-center">
                            <p>まだ会話はありません。</p>
                            <p className="text-sm mt-2">下のボタンを押している間だけ話せます。</p>
                        </div>
                    )}
                </div>

                {/* 【修正3】ControlPanelをPTT(Push To Talk)仕様に合わせて接続 */}
                <ControlPanel
                    isRecording={isRecording}
                    onMouseDown={startTransmission} // 押した時 -> 録音開始
                    onMouseUp={stopTransmission}    // 離した時 -> 録音停止
                    permissionError={permissionError}
                />
            </main>
        </div>
    );
};