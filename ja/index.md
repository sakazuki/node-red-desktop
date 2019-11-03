# Node-RED デスクトップ

[English](../)

Node-REDのデスクトップ版です。

![screen](https://raw.githubusercontent.com/sakazuki/node-red-desktop/doc/screenshot.png)

## ダウンロード


[リリースページ](https://github.com/sakazuki/node-red-desktop/releases)から、実行ファイルをダウンロードしてください。

- Windows: [**Node-RED-Desktop_Setup_X.X.X.exe**](https://github.com/sakazuki/node-red-desktop/releases)
- Mac: [**Node-RED-Desktop-X.X.X.dmg**](https://github.com/sakazuki/node-red-desktop/releases)

## メリット

- バイナリファイル１つでNode-REDを使い始めることができます
- フロー作成のトライ＆エラーがすばやくできます
- 追加アプリ無しでクラウドサービスとのAPI連携ができます
  - Twilio, Alexa, Google home など
- 公式ライブラリ以外からのノード追加が簡単にできます

加えて、
Node-REDの便利な機能のほとんどを使うことができます。

  - [公式ライブラリ](https://flows.nodered.org/) からのノート追加
  - [プロジェクト機能](https://nodered.org/docs/user-guide/projects/)
  - など

## 特徴

- [Node-RED](https://nodered.org/) v1.0.2
- [ngrok](https://ngrok.com/) 組み込み済み
- [Node generator](https://www.npmjs.com/package/node-red-nodegen)  組み込み済み
- npm 組み込み済み
- 多言語UI
  - 英語
  - 日本語
- 自動更新

## Node-RED-Desktopのインストール方法

1. [リリースページ](https://github.com/sakazuki/node-red-desktop/releases)からインストーラーをダウンロードします
1. インストーラーを実行します

## Node-REDの使い方

1. 普通のNode-RED の使い方と同じです
1. 初心者の方は、[Node-RED document](https://nodered.org/docs/)　を参照してください

## HTTPエンドポイントの公開方法

1. **"http in"** と **"http response"** ノードを使ったフローを作成してデプロイします。
1. **[エンドポイント]-[ngrokに接続]**をクリックします
1. https://1234xxxx.ngrok.com　のようなURLが発行されます
1. このURLにアクセスします
- **注意事項** 初期状態では、誰でもこのURLにアクセスできます。  
  必要に応じて、**[ファイル]-[設定...]** でHTTPアクセス認証設定をしてください。

## Node-RED プロジェクト機能を使う

- 前提条件:
  - gitコマンドがインストール済みで使える状態であること (win:Command Prompt or mac:bash)
  - refs: [git](https://git-scm.com/downloads)

1. **[ファイル]-[設定...]** 
1. **[プロジェクトを使う]** をチェック
1. **[アプリを再起動して適用する]** をクリック

- Node-REDのファイル管理との競合を避けるため、ファイルメニューのいくつかが無効になります。

## ノードを追加インストールする

### 公式ライブラリから
1. Node-REDメニューの **[パレットの管理]-[ノードを追加]** から追加します

### 公式ライブラリ以外から
1. **[ツール]-[リモートのノードを追加]** をクリック
1. URLを入力します (example: https://github.com/sakazuki/node-red-contrib-lambda-io.git)

- 情報: Node-RED-Desktop内部で以下のコマンドが実行されます

    ```
    npm install [url]
    ```

### ローカルディスクから
1. **[ツール]-[ローカルのノードを追加]** をクリック
1. package.json ファイルがあるディレクトリを選択します

- 情報: Node-RED-Desktop内部で以下のコマンドが実行されます

    ```
    npm link [dir]
    ```

## ノードの追加に失敗するときは・・・

- Node-RED Desktopは、`node`や`npm`コマンドが実行できない時は  
  ビルトインされた`npm`を使います。 
  しかし、いくつかの NPMモジュールはインストール時に  
  `node`コマンドやC/C++を使ったコンパイルを必要とします。

- このような場合、事前に `node`や必要なコマンドをインストールする必要があります。  
  [Node.js official site](https://nodejs.org/) から  
  `node v12.x.x` をインストールしてからリトライしてみてください。

- Node-RED-Desktopから `node` コマンドが実行できるかどうかは  
  以下のフローでも確認できます。

  ```
  [{"id":"7a4efcce.89b8c4","type":"inject","z":"c37c6de7.10798","name":"","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":140,"y":60,"wires":[["d1acddb8.e8361"]]},{"id":"d1acddb8.e8361","type":"exec","z":"c37c6de7.10798","command":"node -v","addpay":false,"append":"","useSpawn":"false","timer":"","oldrc":false,"name":"","x":320,"y":60,"wires":[["9483c8bb.2c7d58"],["9483c8bb.2c7d58"],["9483c8bb.2c7d58"]]},{"id":"9483c8bb.2c7d58","type":"debug","z":"c37c6de7.10798","name":"","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"false","x":490,"y":60,"wires":[]}]
  ```

## **NODE_MODULE_VERSION** 不整合エラー

- 以下のエラーがでる場合があります。  
  これは、追加したノードに含まれるバイナリファイルと、  
  Node-RED-Desktopに同梱されているNodeバージョンが一致していない場合に発生します。

  ```
  [2019-05-24 19:38:00.395] [warn] [node-red-node-serialport/serialport] Error: The module '\\?\C:\Users\abc\.Node-RED-Desktop\node_modules\@serialport\bindings\build\Release\bindings.node'
  was compiled against a different Node.js version using
  NODE_MODULE_VERSION 47. This version of Node.js requires
  NODE_MODULE_VERSION 70. Please try re-compiling or re-installing
  ```
  
- [electron-rebuild](https://www.npmjs.com/package/electron-rebuild) コマンドが  
  Node-RED-Desktopから利用できる場合、Node-RED-Desktopが自動でこのエラー修正します。

- 手動で修正する場合は、以下のコマンドを実行します

  ```
  ## Windows
  > npm install -g electron-rebuild
  > cd %USERPROFILE%\.Node-RED-Desktop
  > electron-rebuild --version 5.0.0
  
  ## Mac
  $ npm install -g electron-rebuild
  $ cd $USER/.Node-RED-Desktop
  $ electron-rebuild --version 5.0.0
  ```

## MQTT、TCP、UDPなどの表示されない標準ノードを有効にする方法

- **[ファイル]-[設定...]** の、**読み込まないノード** を編集します。  
  MQTTノードを有効にしたい時は、`10-mqtt.js` を削除します。

- デフォルトの **読み込まないノード** は次の通りです
  ```
  10-mqtt.js
  16-range.js
  31-tcpin.js
  32-udp.js
  89-trigger.js
  node-red-node-sentiment
  node-red-node-rbe
  ```

- Node-REDがはじめての方に、見た目がシンプルに映るよう **読み込まないノード** を選択しています。  
  技術的な理由によるものではありません。


## 追加情報

- [Wiki page](https://github.com/sakazuki/node-red-desktop/wiki)　もチェックしてください

