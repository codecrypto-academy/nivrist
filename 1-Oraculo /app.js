// Configuración
const GANACHE_URL = "http://127.0.0.1:7545";
const OWNER_ADDRESS = "0xc6370c109aA94c912C4a175D194B639dc95d8056";
const PRIVATE_KEY = "0xc13d3d1ca406ec2f12da1c217b7d0369fe514307aa504fd9fba26b73c1672d99";
const CONTRACT_ADDRESS = "0x524245Bc133A85EEB24C6030F23d1FE2Fa7e6625";
const NASA_API_BASE = "https://api.nasa.gov/neo/rest/v1/feed";
const NASA_API_KEY = "DEMO_KEY";

let web3;
let contract;

// Inicialización
async function init() {
    try {
        web3 = new Web3(GANACHE_URL);

        // Verificar conexión
        const blockNumber = await web3.eth.getBlockNumber();
        console.log("Conectado a Ganache. Bloque actual:", blockNumber);

        // Agregar cuenta al wallet de web3 (usa ethereumjs internamente para signing)
        web3.eth.accounts.wallet.add(PRIVATE_KEY);

        // Cargar ABI
        const response = await fetch("OraculoCodeCrypto.json");
        const abi = await response.json();

        // Crear instancia del contrato
        contract = new web3.eth.Contract(abi, CONTRACT_ADDRESS);

        // Actualizar UI de conexión
        document.getElementById("statusDot").classList.add("connected");
        document.getElementById("statusText").textContent = "Conectado (Bloque #" + blockNumber + ")";
        document.getElementById("ownerAddress").textContent = OWNER_ADDRESS;
        document.getElementById("contractAddress").textContent = CONTRACT_ADDRESS;

        // Mostrar balance
        const balanceWei = await web3.eth.getBalance(OWNER_ADDRESS);
        const balanceEth = web3.utils.fromWei(balanceWei, "ether");
        document.getElementById("ownerBalance").textContent = parseFloat(balanceEth).toFixed(4) + " ETH";

        // Leer valor inicial
        await leerMeteoritos();

        // Escuchar solo eventos NUEVOS (desde el bloque actual en adelante)
        escucharEventos(blockNumber);
        setInterval(actualizarInfoConexion, 3000);

    } catch (error) {
        console.error("Error de conexión:", error);
        document.getElementById("statusText").textContent = "Error: " + error.message;
    }
}

// Actualizar bloque y balance en la UI
async function actualizarInfoConexion() {
    try {
        const blockNumber = await web3.eth.getBlockNumber();
        document.getElementById("statusText").textContent = "Conectado (Bloque #" + blockNumber + ")";

        const balanceWei = await web3.eth.getBalance(OWNER_ADDRESS);
        const balanceEth = web3.utils.fromWei(balanceWei, "ether");
        document.getElementById("ownerBalance").textContent = parseFloat(balanceEth).toFixed(4) + " ETH";
    } catch (error) {
        console.error("Error actualizando info:", error);
    }
}

// Leer número de meteoritos (call - no requiere gas)
async function leerMeteoritos() {
    try {
        const resultado = await contract.methods.numeroMeteoritos().call();
        document.getElementById("meteoritosValue").textContent = resultado;
        console.log("Meteoritos:", resultado);
    } catch (error) {
        console.error("Error leyendo meteoritos:", error);
        document.getElementById("meteoritosValue").textContent = "Error";
    }
}

// Solo emite el evento __callbackNewData (el listener reacciona de forma independiente)
async function actualizarOraculo() {
    const fecha = document.getElementById("nasaDate").value;
    if (!fecha) {
        alert("Selecciona una fecha");
        return;
    }

    try {
        logTransaccion("Enviando update()...", "pending");
        document.getElementById("nasaInfo").textContent = "Emitiendo evento __callbackNewData... El listener reaccionara automaticamente.";

        const data = contract.methods.update().encodeABI();
        const nonce = await web3.eth.getTransactionCount(OWNER_ADDRESS);
        const gasPrice = await web3.eth.getGasPrice();
        const gas = await contract.methods.update().estimateGas({ from: OWNER_ADDRESS });

        const tx = {
            from: OWNER_ADDRESS,
            to: CONTRACT_ADDRESS,
            data: data,
            gas: gas,
            gasPrice: gasPrice,
            nonce: nonce
        };

        const signed = await web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
        const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);

        logTransaccion("update() - TX: " + receipt.transactionHash, "success");
        document.getElementById("nasaInfo").textContent = "Evento emitido. Esperando que el listener lo detecte...";

        await actualizarInfoConexion();

    } catch (error) {
        console.error("Error emitiendo update:", error);
        logTransaccion("Error: " + error.message, "error");
        document.getElementById("nasaInfo").textContent = "Error: " + error.message;
    }
}

// Callback del oráculo: consulta NASA API y escribe el resultado en el contrato
async function updateData() {
    const fecha = document.getElementById("nasaDate").value;

    try {
        logEvento("Evento detectado → Consultando NASA NEO API (" + fecha + ")...");
        document.getElementById("nasaInfo").textContent = "Listener activo: Consultando NASA NEO API para " + fecha + "...";

        const url = NASA_API_BASE + "?start_date=" + fecha + "&end_date=" + fecha + "&api_key=" + NASA_API_KEY;
        const response = await fetch(url);
        const json = await response.json();
        const elementCount = json.element_count;

        logEvento("NASA responde: " + elementCount + " meteoritos cercanos el " + fecha);
        document.getElementById("nasaInfo").textContent = "Escribiendo " + elementCount + " en el contrato...";

        // Escribir en el contrato
        const data = contract.methods.setNnumeroMeteoritos(elementCount).encodeABI();
        const nonce = await web3.eth.getTransactionCount(OWNER_ADDRESS);
        const gasPrice = await web3.eth.getGasPrice();
        const gas = await contract.methods.setNnumeroMeteoritos(elementCount).estimateGas({ from: OWNER_ADDRESS });

        const tx = {
            from: OWNER_ADDRESS,
            to: CONTRACT_ADDRESS,
            data: data,
            gas: gas,
            gasPrice: gasPrice,
            nonce: nonce
        };

        const signed = await web3.eth.accounts.signTransaction(tx, PRIVATE_KEY);
        const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);

        logTransaccion("setNnumeroMeteoritos(" + elementCount + ") - TX: " + receipt.transactionHash, "success");
        document.getElementById("nasaInfo").textContent = "Completado: " + elementCount + " meteoritos cercanos a la Tierra el " + fecha;

        await leerMeteoritos();
        await actualizarInfoConexion();

    } catch (error) {
        console.error("Error en updateData:", error);
        logTransaccion("Error updateData: " + error.message, "error");
        document.getElementById("nasaInfo").textContent = "Error: " + error.message;
    }
}

// Listener independiente: detecta eventos __callbackNewData y reacciona llamando updateData
function escucharEventos(bloqueInicial) {
    let ultimoBloqueRevisado = bloqueInicial;

    setInterval(async () => {
        try {
            const bloqueActual = await web3.eth.getBlockNumber();
            if (bloqueActual > ultimoBloqueRevisado) {
                const eventos = await contract.getPastEvents("__callbackNewData", {
                    fromBlock: ultimoBloqueRevisado + 1,
                    toBlock: "latest"
                });

                for (const evento of eventos) {
                    logEvento("__callbackNewData - Bloque #" + evento.blockNumber + " - TX: " + evento.transactionHash);
                    // Reaccionar al evento: consultar NASA y escribir al contrato
                    await updateData();
                }

                ultimoBloqueRevisado = bloqueActual;
            }
        } catch (error) {
            console.error("Error escuchando eventos:", error);
        }
    }, 2000);
}

// Agregar entrada al log de transacciones
function logTransaccion(mensaje, tipo) {
    const logArea = document.getElementById("txLog");
    const emptyMsg = logArea.querySelector(".empty-log");
    if (emptyMsg) emptyMsg.remove();

    const entry = document.createElement("div");
    entry.className = "log-entry";

    const ahora = new Date().toLocaleTimeString();
    entry.innerHTML = '<span class="time">[' + ahora + ']</span> <span class="' + tipo + '">' + mensaje + '</span>';

    logArea.insertBefore(entry, logArea.firstChild);
}

// Agregar entrada al log de eventos
function logEvento(mensaje) {
    const logArea = document.getElementById("eventLog");
    const emptyMsg = logArea.querySelector(".empty-log");
    if (emptyMsg) emptyMsg.remove();

    const entry = document.createElement("div");
    entry.className = "log-entry";

    const ahora = new Date().toLocaleTimeString();
    entry.innerHTML = '<span class="time">[' + ahora + ']</span> <span class="success">' + mensaje + '</span>';

    logArea.insertBefore(entry, logArea.firstChild);
}

// Iniciar al cargar la página
window.addEventListener("load", init);
