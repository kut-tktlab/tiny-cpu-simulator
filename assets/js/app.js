// ボタン
const run_all_button = document.getElementById("run-all-button");
const stop_button = document.getElementById("stop_button");
const run_step_button = document.getElementById("run_step_button")
const reset_button = document.getElementById("reset-button");
const download_button = document.getElementById("download-button");
const upload_button = document.getElementById("upload-button");
const shift_left_button = document.getElementById("shift-left-button");
const shift_right_button = document.getElementById("shift-right-button");

// シフト用のメモリ
const base_address = document.getElementById("base-address");

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

// レジスタの値を表示
for(let i = 1; i < Object.keys(registers).length + 1; i++) {
    update_register(i);
}

// フラグの値を表示
for(let i = 1; i < Object.keys(flags).length + 1; i++) {
    update_flag();
}

// エラーの関数
const error = (message) => {
    clearTimeout(process);
    is_running = false;

    // エラーメッセージ表示
    error_message = message;
    output_error_message.textContent = error_message;

    registers[4] = 0;
}

// メモリの入力制限
base_address.oninput = () => {
    let memory_value = base_address.value;
    base_address.value = memory_value.replace(/[^A-Fa-f0-9]/, "");
}

for (let i = 0; i < addresses.length; i++) {
    addresses[i].oninput = () => {
        let memory_value = addresses[i].value;
        addresses[i].value = memory_value.replace(/[^A-Fa-f0-9]/, "");
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
    if (result === 0) {
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
    if (jump_destination_address > addresses.length - 1) {
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
    if (read_address > addresses.length - 1) {
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

    // 最後のメモリか、終了命令が出ているか、エラーが出ている場合は止める
    if(registers[4] >= addresses.length - 1 || is_end) {
        registers[4] = 0;

        // ステップ実行ボタンではないとき
        if (!pushed_run_step_btn) {
            clearTimeout(process);
            is_running = false;
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
    } else {
        registers[4] = 0;
        is_end = true;
    }
}

// 左シフトボタンの動作
shift_left_button.onclick = () => {
    let address_num = parseInt(base_address.value, 16);
    
    if (address_num > addresses.length - 1) {
        error("シフト用のアドレスの指定に誤りがあります");
        return;
    }

    for (let i = address_num + 1; i < addresses.length; i++) {
        addresses[i - 1].value = addresses[i].value;
    }
    
    addresses[addresses.length - 1].value = "00";
}

// 右シフトボタンの動作
shift_right_button.onclick = () => {
    let address_num = parseInt(base_address.value, 16);

    if (address_num > addresses.length - 1) {
        error("シフト用のアドレスの指定に誤りがあります");
        return;
    }

    for (let i = addresses.length - 2; i >= address_num; i--) {
        addresses[i + 1].value = addresses[i].value;
    }

    addresses[address_num].value = "00";
}

// ゼロクリアボタンの動作
reset_button.onclick = () => {
    address_form.reset();

    // メモリマップの色を初期化
    for (let i = 0; i < addresses.length; i++) {
        addresses[i].style.backgroundColor = "";
        addresses[i].style.borderWidth = "";
    }
    if (past_accessed_address !== null) {
        addresses[past_accessed_address].style.backgroundColor = "";
        past_accessed_address = null;
    }
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