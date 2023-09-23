// ボタン
const run_all_button = document.getElementById("run-all-button");
const stop_button = document.getElementById("stop_button");
const run_step_button = document.getElementById("run_step_button")
const reset_button = document.getElementById("reset-button");
const download_button = document.getElementById("download-button");
const upload_button = document.getElementById("upload-button");
const copy_and_paste_button = document.getElementById("copy-and-paste-button");
const copy_button = document.getElementById("copy-button");
const cut_button = document.getElementById("cut-button");
const paste_button = document.getElementById("paste-button");
const run_mode_button = document.getElementById("run-mode-button");
const range_button = document.getElementById("range-button");

// 実行速度
const speed = document.getElementById("speed");

// レジスタ、フラグ
const a = document.getElementById("a");
const b = document.getElementById("b");
const c = document.getElementById("c");
const ip = document.getElementById("ip");
const zero = document.getElementById("zero");
const carry = document.getElementById("carry");


// エラーメッセージやヒントを表示するpタグ
const output_error_message = document.getElementById("error_message");
const download_tool_tip = document.getElementById("download-tool-tip");
const upload_tool_tip = document.getElementById("upload-tool-tip");

// メモリマップを表すフォーム
const address_form = document.getElementById("addresses");

// メモリの値
const addresses = document.getElementsByClassName("address");

// エラーメッセージ
let error_message = "";

// 実行中かどうかの変数
let is_running = false;

// プログラム終了の命令が出たかどうかの変数
let is_end = false;

// ステップ実行ボタンが押されたかの変数
let pushed_run_step_btn = false;

// メモリ編集中かの変数
let copy_and_paste_mode = false;

// メモリ編集に関する変数
let from_address = null;
let to_address = null;
let target_address = null;
let count_of_address = 1;
let copied_memories = [];

// 実行に関する変数
let process;
let past_address_number = null;
let used_memories = null;
let past_accessed_address = null;

// レジスタと値の対応
const registers = {
    1: 0, 
    2: 0, 
    3: 0, 
    4: 0, 
};

// フラグと値の対応
const flags = {
    1: false, 
    2: false, 
};

// レジスタの値の表示を更新
const update_register = (register_number) => {
    let num = ('00' + (registers[register_number] >>> 0).toString(16)).slice(-2);
    switch(register_number) {
        case 1:
            a.textContent = num;
            break;
        case 2:
            b.textContent = num;
            break;
        case 3:
            c.textContent = num;
            break;
        default:
            ip.textContent = num;
            break;
    }
}

// フラグの値の表示を更新
const update_flag = () => {
    for(let i = 1; i < Object.keys(flags).length + 1; i++) {
        let value = flags[i];
        let printed_value;
        if (value) {
            printed_value = "T";
        } else {
            printed_value = "F";
        }

        switch(i) {
            case 1:
                zero.textContent = printed_value;
                break;
            case 2:
                carry.textContent = printed_value;
                break;
            default:
                break;
        }
    }
}

// メモリ編集に関わる要素の状態を変える
const change_edit_items_state = (state) => {
    copy_and_paste_button.disabled = state;

    for (let i = 0; i < addresses.length; i++) {
        if (state) {
            addresses[i].setAttribute("readonly", "readonly");
        } else {
            addresses[i].removeAttribute("readonly");
        }
    }

    if (state) {
        copy_and_paste_button.style.boxShadow = "none";
    } else {
        copy_and_paste_button.style.boxShadow = "";
    }
}

// レジスタの値を表示
for(let i = 1; i < Object.keys(registers).length + 1; i++) {
    update_register(i);
}

// フラグの値を表示
for(let i = 1; i < Object.keys(flags).length + 1; i++) {
    update_flag();
}

// 実行時のエラーの関数
const error = (message) => {
    clearTimeout(process);
    is_running = false;

    // メモリ編集に関わるボタンなどを使える様にする
    change_edit_items_state(false);

    // エラーメッセージ表示
    error_message = message;
    output_error_message.textContent = error_message;

    registers[4] = 0;
}

// 編集時のエラーの関数
const edit_error = (message) => {
    // エラーメッセージ表示
    error_message = message;
    output_error_message.textContent = error_message;
}

for (let i = 0; i < addresses.length; i++) {
    // 入力制限
    addresses[i].oninput = () => {
        let memory_value = addresses[i].value;
        addresses[i].value = memory_value.replace(/[^A-Fa-f0-9]/, "");
    }

    // メモリ編集中にメモリがクリックされた場合
    addresses[i].onclick = () => {
        if (copy_and_paste_mode) {
            // エラーメッセージを削除
            output_error_message.textContent = "";

            // 編集するメモリを指定
            if (count_of_address === 1) {
                // 範囲が設定されていたら一旦初期化
                if (from_address !== null && to_address !== null) {
                    // 色を元に戻す
                    for (let i = from_address; i <= to_address; i++) {
                        addresses[i].style.backgroundColor = ""
                    }

                    from_address = null;
                    to_address = null;

                    // ゼロクリアボタンとコピーボタンとカットボタンを使えないようにする
                    copy_button.disabled = true;
                    cut_button.disabled = true;
                    reset_button.disabled = true;
                    range_button.disabled = true;
                    copy_button.style.boxShadow = "none";
                    cut_button.style.boxShadow = "none";
                    reset_button.style.boxShadow = "none";
                    range_button.style.boxShadow = "none";
                }

                from_address = i;

                // 色を変える
                addresses[from_address].style.backgroundColor = "#87cefa"

                count_of_address = 2;
            } else if (count_of_address === 2){
                to_address = i;

                // 範囲を整形
                if (from_address > to_address) {
                    [from_address, to_address] = [to_address, from_address];

                    // from_addressの色が変わらないので変える
                    addresses[from_address].style.backgroundColor = "#87cefa"
                }

                // 色を変える
                for (let i = from_address + 1; i <= to_address; i++) {
                    addresses[i].style.backgroundColor = "#87cefa";
                }

                // ゼロクリアボタンとコピーボタンとカットボタンを使えるようにする
                copy_button.disabled = false;
                cut_button.disabled = false;
                reset_button.disabled = false;
                copy_button.style.boxShadow = "";
                cut_button.style.boxShadow = "";
                reset_button.style.boxShadow = "";

                count_of_address = 1;
            } else if (count_of_address === 3) {
                // メモリが指定されていた場合初期化
                if (target_address !== null) {
                    // 色を元に戻す
                    addresses[target_address].style.backgroundColor = "";

                    target_address = null;
                }
                target_address = i;

                // 色を元に戻す
                for (let i = from_address; i <= to_address; i++) {
                    addresses[i].style.backgroundColor = "";
                }

                // 色を変える
                addresses[i].style.backgroundColor = "#87cefa";

                // ゼロクリアボタンとコピーボタンとカットボタンを使えないようにする
                copy_button.disabled = true;
                cut_button.disabled = true;
                reset_button.disabled = true;
                copy_button.style.boxShadow = "none";
                cut_button.style.boxShadow = "none";
                reset_button.style.boxShadow = "none";

                // ペーストボタンを使えるようにする
                paste_button.disabled = false;
                paste_button.style.boxShadow = "";
            }
        }
    }
}

// HLT命令(プログラムを終了する命令)
const hlt = () => {
    is_end = true;
}

// mov(即値)命令(レジスタに即値を代入する命令)
const mov_immediate = () => {
    // レジスタ番号を取得
    registers[4]++;
    let register_num = parseInt(addresses[registers[4]].value, 16);
    
    // レジスタ番号が違ったらエラーを表示
    if (register_num > 3 || register_num <= 0 || isNaN(register_num)) {
        error("レジスタの番号が違います");
        return;
    }

    // 代入する即値を取得
    registers[4]++;
    let immediate = parseInt(addresses[registers[4]].value, 16);

    // 即値が読めない場合はエラー
    if (isNaN(immediate)) {
        error("16進数で値を設定してください");
        return;
    }

    // レジスタに代入
    registers[register_num] = immediate;

    // 代入したレジスタの表示を更新
    update_register(register_num);
}

// mov(レジスタ)命令(レジスタにレジスタの値を代入する命令)
const mov_register = () => {
    // レジスタ番号を取得
    registers[4]++;
    let register_num1 = parseInt(addresses[registers[4]].value, 16);
    
    // レジスタ番号が違ったらエラーを表示
    if (register_num1 > 3 || register_num1 <= 0 || isNaN(register_num1)) {
        error("レジスタの番号が違います");
        return;
    }

    // 代入するレジスタを取得
    registers[4]++;
    let register_num2 = parseInt(addresses[registers[4]].value, 16);

    // レジスタ番号が違ったらエラーを表示
    if (register_num2 > 3 || register_num2 <= 0 || isNaN(register_num2)) {
        error("レジスタの番号が違います");
        return;
    }

    // レジスタに代入
    registers[register_num1] = registers[register_num2];

    // 代入したレジスタの表示を更新
    update_register(register_num1);
}

// add命令(足し算)、sub命令(引き算)
const add_or_sub = (operator) => {
    // 計算結果を代入するレジスタ番号を取得
    registers[4]++;
    let result_register_num = parseInt(addresses[registers[4]].value, 16);
    
    // レジスタ番号が違ったらエラーを表示
    if (result_register_num > 3 || result_register_num <= 0 || isNaN(result_register_num)) {
        error("レジスタの番号が違います");
        return;
    }

    // 計算するレジスタ番号(1つ目)を取得
    registers[4]++;
    let calclated_register_num1 = parseInt(addresses[registers[4]].value, 16);
    
    // レジスタ番号が違ったらエラーを表示
    if (calclated_register_num1 > 3 || calclated_register_num1 <= 0 || isNaN(calclated_register_num1)) {
        error("レジスタの番号が違います");
        return;
    }

    // 計算するレジスタ番号(2つ目)を取得
    registers[4]++;
    let calclated_register_num2 = parseInt(addresses[registers[4]].value, 16);
    
    // レジスタ番号が違ったらエラーを表示
    if (calclated_register_num2 > 3 || calclated_register_num2 <= 0 || isNaN(calclated_register_num2)) {
        error("レジスタの番号が違います");
        return;
    }

    let result;
    // 計算をして結果を取得
    if (operator === "+") {
        result = registers[calclated_register_num1] + registers[calclated_register_num2];
    } else {
        result = registers[calclated_register_num1] - registers[calclated_register_num2];
    }

    // 計算結果が0ならzeroフラグを立てる
    if ((result & 0xff) === 0) {
        flags[1] = true;
    } else {
        flags[1] = false;
    }

    // 計算結果が255より大きいまたは0未満ならcarryフラグを立てる
    if (result < 0 || result > 255) {
        flags[2] = true;

        // 計算結果を0以上255未満に修正
        if (result > 255) {
            result -= 256;
        } else if (result < 0) {
            result += 256;
        }
    } else {
        flags[2] = false;
    }

    // レジスタの値を更新
    registers[result_register_num] = result;

    // レジスタの表示を更新
    update_register(result_register_num);
        
    // フラグの表示を更新
    update_flag();
}

// cmp命令（比較命令）
const cmp = () => {
    // レジスタ番号を取得
    registers[4]++;
    let register_num1 = parseInt(addresses[registers[4]].value, 16);
    
    // レジスタ番号が違ったらエラーを表示
    if (register_num1 > 3 || register_num1 <= 0 || isNaN(register_num1)) {
        error("レジスタの番号が違います");
        return;
    }

    // 比較するレジスタを取得
    registers[4]++;
    let register_num2 = parseInt(addresses[registers[4]].value, 16);

    // レジスタ番号が違ったらエラーを表示
    if (register_num2 > 3 || register_num2 <= 0 || isNaN(register_num2)) {
        error("レジスタの番号が違います");
        return;
    }

    // レジスタに格納されている値を取得
    const value1 = registers[register_num1];
    const value2 = registers[register_num2];

    // 引き算
    const result = value1 - value2;

    // Zフラグ
    if (result === 0) {
        flags[1] = true;
    } else {
        flags[1] = false;
    }

    // Cフラグ、 Nフラグ
    if (result < 0) {
        flags[2] = true;
    } else {
        flags[2] = false;
    }

    // フラグの表示を更新
    update_flag();
}

// ジャンプ命令
const jump = (conditions) => {
    // ジャンプ先のアドレスを取得
    registers[4]++;
    const jump_destination_address = parseInt(addresses[registers[4]].value, 16);

    // 指定したアドレスがない場合
    if (jump_destination_address > addresses.length - 1 || isNaN(jump_destination_address)) {
        error("アドレスの指定に誤りがあります");
        return;
    }

    // 条件分岐
    let judge = false;
    if (conditions === ">") {
        if (!flags[1] && !flags[2]) {
            judge = true;
        }
    } else if (conditions === ">=") {
        if (!flags[2]) {
            judge = true;
        }
    } else if (conditions === "==") {
        if (flags[1]) {
            judge = true;
        }
    }else if (conditions === "!=") {
        if (!flags[1]) {
            judge = true;
        }
    } else if (conditions === "<=") {
        if (flags[1] || flags[2]) {
            judge = true;
        }
    } else if (conditions === "<") {
        if (flags[2]) {
            judge = true;
        }
    } else {
        judge = true;
    }

    if (judge) {
        registers[4] = jump_destination_address - 1;
    }
}

// str命令（レジスタの値をメモリにコピーする命令）、ldr命令（メモリの値をレジスタにコピーする命令）
const str_or_ldr = (argument) => {
    // レジスタ番号を取得
    registers[4]++;
    let register_num1 = parseInt(addresses[registers[4]].value, 16);
    
    // レジスタ番号が違ったらエラーを表示
    if (register_num1 > 3 || register_num1 <= 0 || isNaN(register_num1)) {
        error("レジスタの番号が違います");
        return;
    }

    // レジスタ番号を取得
    registers[4]++;
    let register_num2 = parseInt(addresses[registers[4]].value, 16);
    
    // レジスタ番号が違ったらエラーを表示
    if (register_num2 > 3 || register_num2 <= 0 || isNaN(register_num2)) {
        error("レジスタの番号が違います");
        return;
    }

    // アドレスを取得
    let read_address = registers[register_num2];

    // 指定したアドレスがない場合
    if (read_address > addresses.length - 1 || isNaN(read_address)) {
        error("アドレスの指定に誤りがあります");
        return;
    }

    // 値をコピー
    if (argument === "str") {
        addresses[read_address].value = ('00' + registers[register_num1].toString(16)).slice(-2);
    } else {
        registers[register_num1] = parseInt(addresses[read_address].value, 16);

        // レジスタの表示を更新
        update_register(register_num1);
    }

    // アクセスしたメモリセルの色を変える
    addresses[read_address].style.backgroundColor =
        (argument === "str" ? "#f3cccd" : "#d9ead4");
    past_accessed_address = read_address;
}

// 命令と使用するメモリの数
const orders = [
    [hlt, 1],           // 00: 終了命令
    [mov_immediate, 3], // 01: レジスタに即値を代入する命令
    [mov_register, 3],  // 02: レジスタにレジスタの値を代入する命令
    [add_or_sub, 4],    // 03: 加算命令
    [add_or_sub, 4],    // 04: 減算命令
    [cmp, 3],           // 05: 比較命令
    [jump, 2],          // 06: 無条件ジャンプ命令
    [jump, 2],          // 07: ジャンプ命令(>)
    [jump, 2],          // 08: ジャンプ命令(>=)
    [jump, 2],          // 09: ジャンプ命令(==)
    [jump, 2],          // 0a: ジャンプ命令(!=)
    [jump, 2],          // 0b: ジャンプ命令(<=)
    [jump, 2],          // 0c: ジャンプ命令(<)
    [str_or_ldr, 3],    // 0d: メモリにレジスタの値をコピーする命令
    [str_or_ldr, 3],    // 0e: レジスタにメモリの値をコピーする命令
];

// メモリの値に対応する命令を実行
const output_memory = () => {
    // エラーメッセージ初期化
    error_message = "";
    output_error_message.textContent = error_message;

    // 読んでいるメモリのアドレスを16進数でIPレジスタに表示
    let num = ('00' + registers[4].toString(16)).slice(-2);
    ip.textContent = num;

    // 1つ前に読んでいたメモリの色を元に戻す
    if (past_address_number !== null) {
        for (let i = past_address_number; i <= past_address_number + used_memories - 1; i++) {
            // 最後のメモリを超えたアドレスを指定している場合は何もしない
            if (i <= addresses.length - 1) {
                addresses[i].style.backgroundColor = "";
                addresses[i].style.borderWidth = "";
            }
        }
    }
    if (past_accessed_address !== null) {
        addresses[past_accessed_address].style.backgroundColor = "";
        past_accessed_address = null;
    }

    // 命令が書いてあるアドレスを保存
    past_address_number = registers[4];

    // メモリの値を10進数に変換
    let address_value = addresses[registers[4]].value;
    address_value = parseInt(address_value, 16);

    // メモリの値が16進数か確認
    if (isNaN(address_value)) {
        error("16進数で値を設定してください");
        return;
    }

    // 値に対応する命令があるか確認
    if (!orders[address_value]) {
        error("値に対応する命令がありません");
        return;
    }

    // 読んでるメモリの色を変える
    for (let i = 0; i < orders[address_value][1]; i++) {
        // 最後のメモリを超えていないかを確認
        if (addresses[registers[4] + i]) {
            addresses[registers[4] + i].style.backgroundColor = "#fab387";
        } else {
            error("メモリマップの上限を超えました");
            return;
        }
    }

    // 命令を実行
    if (address_value === 3) {
        orders[address_value][0]("+");
    } else if (address_value === 4) {
        orders[address_value][0]("-");
    } else if (address_value === 6) {
        orders[address_value][0](null);
    } else if (address_value === 7) {
        orders[address_value][0](">");
    } else if (address_value === 8) {
        orders[address_value][0](">=");
    } else if (address_value === 9) {
        orders[address_value][0]("==");
    } else if (address_value === 10) {
        orders[address_value][0]("!=");
    } else if (address_value === 11) {
        orders[address_value][0]("<=");
    } else if (address_value === 12) {
        orders[address_value][0]("<");
    } else if (address_value === 13) {
        orders[address_value][0]("str");
    } else if (address_value === 14) {
        orders[address_value][0]("ldr");
    } else {
        orders[address_value][0]();
    }

    // 命令で使用されたメモリの数を保存
    used_memories = orders[address_value][1];

    // 最後のメモリか、終了命令が出ている場合は止める
    if(registers[4] >= addresses.length - 1 || is_end) {
        registers[4] = 0;

        // ステップ実行ボタンではないとき
        if (!pushed_run_step_btn) {
            clearTimeout(process);
            is_running = false;

            // メモリ編集に関わるボタンなどを使える様にする
            change_edit_items_state(false);
        }
    } else {
        registers[4]++;
    }
}

// 定期実行器
const interval_runner = () => {
    if (is_running) {
        output_memory();
    }
    // output_memory内でis_running = falseになることがあるので再度チェック
    if (is_running) {
        // 実行速度を取得
        const run_speed = speed.value;

        // プログラム実行
        process = setTimeout(interval_runner, run_speed);
        // 次のタスクまでの間隔が output_memoryの処理時間 + run_speed
        // になってしまうが, output_memory実行中に次のoutput_memoryが
        // 実行される方が嫌なので, あえてこうしている.
    }
}

// 実行ボタンの動作
run_all_button.onclick = () => {
    // プログラムを実行
    if(!is_running) {
        is_running = true;
        is_end = false;

        // レジスタ初期化
        for(let i = 1; i < Object.keys(registers).length + 1; i++) {
            registers[i] = 0;
            update_register(i);
        }

        // フラグ初期化
        for(let i = 1; i < Object.keys(flags).length + 1; i++) {
            flags[i] = false;
            update_flag();
        }

        // 実行速度を取得
        const run_speed = speed.value;

        // メモリ操作に関わるボタンなどを使えない様にする
        change_edit_items_state(true);

        // プログラム実行
        process = setTimeout(interval_runner, run_speed);
    }
}

// ステップ実行ボタンの動作
run_step_button.onclick = () => {
    // 実行中に押された時の処理
    if (is_running) {
        clearTimeout(process);
        is_running = false;

        // メモリ編集に関わるボタンなどを使える様にする
        change_edit_items_state(false);
    }

    pushed_run_step_btn = true;

    // 終了命令後の場合はレジスタとフラグとメモリの色を初期化
    if (is_end) {
        // レジスタを初期化
        for(let i = 1; i < Object.keys(registers).length + 1; i++) {
            registers[i] = 0;
            update_register(i);
        }

        // フラグ初期化
        for(let i = 1; i < Object.keys(flags).length + 1; i++) {
            flags[i] = false;
            update_flag();
        }

        is_end = false;
    }

    output_memory();

    pushed_run_step_btn = false;
}

// ストップボタンの動作
stop_button.onclick = () => {
    if(is_running) {
        clearTimeout(process);
        is_running = false;

        // メモリ編集に関わるボタンなどを使える様にする
        change_edit_items_state(false);
    } else {
        // レジスタを初期化
        for(let i = 1; i < Object.keys(registers).length + 1; i++) {
            registers[i] = 0;
            update_register(i);
        }

        // フラグ初期化
        for(let i = 1; i < Object.keys(flags).length + 1; i++) {
            flags[i] = false;
            update_flag();
        }

        // メモリマップの色を初期化
        for (let i = 0; i < addresses.length; i++) {
            addresses[i].style.backgroundColor = "";
            addresses[i].style.borderWidth = "";
        }
    }
}

// メモリ編集ボタンの動作
copy_and_paste_button.onclick = () => {
    // レジスタを初期化
    for(let i = 1; i < Object.keys(registers).length + 1; i++) {
        registers[i] = 0;
        update_register(i);
    }

    // フラグ初期化
    for(let i = 1; i < Object.keys(flags).length + 1; i++) {
        flags[i] = false;
        update_flag();
    }

    // メモリマップの色を初期化
    for (let i = 0; i < addresses.length; i++) {
        addresses[i].style.backgroundColor = "";
        addresses[i].style.borderWidth = "";
    }

    // メモリ編集ボタンを非表示
    copy_and_paste_button.style.display = "none";

    // 実行モードボタンとメモリ編集に使用するボタンを表示
    copy_button.style.display = "block";
    cut_button.style.display = "block";
    paste_button.style.display = "block";
    reset_button.style.display = "block";
    run_mode_button.style.display = "block";
    range_button.style.display = "block";
    copy_button.style.boxShadow = "none";
    cut_button.style.boxShadow = "none";
    paste_button.style.boxShadow = "none";
    reset_button.style.boxShadow = "none";
    range_button.style.boxShadow = "none";

    // メモリ編集で使用しないものを使用不可にする
    run_all_button.disabled = true;
    run_step_button.disabled = true;
    stop_button.disabled = true;
    speed.disabled = true;
    upload_button.disabled = true;
    download_button.disabled = true;
    reset_button.disabled = true;
    run_all_button.style.boxShadow = "none";
    run_step_button.style.boxShadow = "none";
    stop_button.style.boxShadow = "none";
    upload_button.style.boxShadow = "none";
    download_button.style.boxShadow = "none";
    reset_button.style.boxShadow = "none";

    for (let i = 0; i < addresses.length; i++) {
        addresses[i].setAttribute("readonly", "readonly");
    }

    copy_and_paste_mode = true;
}

// ゼロクリアボタンの動作
reset_button.onclick = () => {
    for (let i = from_address; i <= to_address; i++) {
        addresses[i].value = "00";
        addresses[i].style.backgroundColor = "";
    }

    count_of_address = 1;
}

// コピーボタンの動作
copy_button.onclick = () => {
    // コピーされた値がすでにあった場合は消す
    if (copied_memories.length > 0) {
        copied_memories = [];
    }

    for (let i = from_address; i <= to_address; i++) {
        copied_memories.push(addresses[i].value);
    }

    // 範囲指定ボタンを使えるようにする
    range_button.disabled = false;
    range_button.style.boxShadow = "";

    count_of_address = 3;
}

// カットボタンの動作
cut_button.onclick = () => {
    // コピーされた値がすでにあった場合は消す
    if (copied_memories.length > 0) {
        copied_memories = [];
    }

    for (let i = from_address; i <= to_address; i++) {
        copied_memories.push(addresses[i].value);
        addresses[i].value = "00";
    }

    // 範囲指定ボタンを使えるようにする
    range_button.disabled = false;
    range_button.style.boxShadow = "";

    count_of_address = 3;
}

// ペーストボタンの動作
paste_button.onclick = () => {
    // コピーした内容がメモリ数を超えたらエラー
    if (target_address + copied_memories.length > addresses.length) {
        edit_error("コピーした内容がメモリ数を超えています");

        addresses[target_address].style.backgroundColor = "";

        count_of_address = 3;

        return;
    }

    for (let i = 0; i < copied_memories.length; i++) {
        addresses[target_address + i].value = copied_memories[i];
    }

    addresses[target_address].style.backgroundColor = "";

    count_of_address = 3;
}

// 範囲指定に戻るボタンの動作
range_button.onclick = () => {
    count_of_address = 1;

    // メモリマップの色を初期化
    for (let i = 0; i < addresses.length; i++) {
        addresses[i].style.backgroundColor = "";
        addresses[i].style.borderWidth = "";
    }

    // メモリ編集に関するボタンを使えないようにする
    copy_button.disabled = true;
    cut_button.disabled = true;
    reset_button.disabled = true;
    range_button.disabled = true;
    paste_button.disabled = true;
    paste_button.style.boxShadow = "none";
    copy_button.style.boxShadow = "none";
    cut_button.style.boxShadow = "none";
    reset_button.style.boxShadow = "none";
    range_button.style.boxShadow = "none";
}

// 実行モードボタンの動作
run_mode_button.onclick = () => {
    // 色を元に戻す
    for (let i = 0; i < addresses.length; i++) {
        addresses[i].style.backgroundColor = "";
    }

    // 範囲が設定されていたら初期化
    if (from_address !== null || to_address !== null) {
        // 変数を初期化
        from_address = null;
        to_address = null;
        target_address = null;
        count_of_address = 1;
        copied_memories = [];

        // メモリ編集に関するボタンを使えないようにする
        copy_button.disabled = true;
        cut_button.disabled = true;
        reset_button.disabled = true;
        range_button.disabled = true;
        paste_button.disabled = true;
        range_button.style.boxShadow = "none";
        copy_button.style.boxShadow = "none";
        cut_button.style.boxShadow = "none";
        reset_button.style.boxShadow = "none";
        paste_button.style.boxShadow = "none";
    }

    // 実行モードボタンとコピペに使用するボタンを非表示
    reset_button.style.display = "none";
    copy_button.style.display = "none";
    cut_button.style.display = "none";
    paste_button.style.display = "none";
    run_mode_button.style.display = "none";
    range_button.style.display = "none";

    // メモリ編集ボタンを表示
    copy_and_paste_button.style.display = "block";

    // 実行モードで使用するボタンを使用できるようにする
    run_all_button.disabled =  false;
    run_step_button.disabled =  false;
    stop_button.disabled =  false;
    speed.disabled =  false;
    upload_button.disabled =  false;
    download_button.disabled =  false;
    reset_button.disabled =  false;
    run_all_button.style.boxShadow = "";
    run_step_button.style.boxShadow = "";
    stop_button.style.boxShadow = "";
    upload_button.style.boxShadow = "";
    download_button.style.boxShadow = "";
    reset_button.style.boxShadow = "";

    for (let i = 0; i < addresses.length; i++) {
        addresses[i].removeAttribute("readonly");
    }

    copy_and_paste_mode = false;
}

// ダウンロードボタンの動作
download_button.onclick = () => {
    let hex = "";

    for (let i = 0; i < addresses.length; i++) {
        hex = hex + `${addresses[i].value.padStart(2, '0')}`
                  + (i % 16 == 15 ? "\n" : " ");
    }

    let blob = new Blob([hex], {type: 'text/plain'});
    let url = URL.createObjectURL(blob);

    var link = document.createElement('a');
    link.href = url;
    link.download = 'program.hex';
    link.click();
}

// アップロードボタンの動作
upload_button.onclick = () => {
    // エラーメッセージ初期化
    error_message = "";
    output_error_message.textContent = error_message;

    const file_input = document.createElement("input");
    file_input.type = "file";
    file_input.accept = ".hex,.txt";
    file_input.style.display = "none";

    file_input.addEventListener("change", (e) => {
        let selected_file = e.target.files[0];

        const reader = new FileReader();
        reader.onload = () => {
            let content = reader.result;
            let memory_values = content.split(/\s+/);

            const hex_pattern = /^[0-9A-Fa-f]+$/;
            for (let i = 0; i < memory_values.length - 1; i++) {
                // ファイルの中身が16進数か確認
                if (hex_pattern.test(memory_values[i])) {
                    addresses[i].value = memory_values[i];
                } else {
                    error("ファイルに16進数以外の値が含まれています");
                    break;
                }
            }
        }

        reader.readAsText(selected_file);
    });

    document.body.appendChild(file_input);
    file_input.click();
}

// メモリ入力後、enterを押したら次のメモリに移動する動作
for(let i = 0; i < addresses.length; i++) {
    addresses[i].addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            if (i < addresses.length - 1) {
                addresses[i + 1].focus();
                addresses[i + 1].setSelectionRange(2, 2);
            } else {
                addresses[i].blur();
            }
        }
    });
}
