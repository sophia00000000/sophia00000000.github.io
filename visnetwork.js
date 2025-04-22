// Clase que maneja la visualización de un grafo interactivo usando la librería vis.js
class VisNetwork {
    constructor(container, nodes, edges, options, debug=true) {
        // Inicializa los nodos y aristas del grafo como conjuntos de datos
        this.nodes = new vis.DataSet(nodes);
        this.edges = new vis.DataSet(edges);
        
        // Crea el grafo en el contenedor dado
        this.visnetwork = new vis.Network(container, { nodes: this.nodes, edges: this.edges }, options);
        this.debug = debug; // Modo de depuración para imprimir mensajes en la consola
        this.selected_node = undefined; // Variable para almacenar el nodo seleccionado
        this.is_changed = false; // Indica si el grafo ha cambiado

        // Definir manejadores de eventos
        this.visnetwork.on("click", (params) => this.on_click(params));
        this.visnetwork.on("selectNode", (params) => this.on_node_selected(params));
        this.visnetwork.on("selectEdge", (params) => this.on_edge_selected(params));
        this.visnetwork.on("deselectNode", (params) => {
            if (this.debug) console.log("Node deselected");
        });
        this.visnetwork.on("deselectEdge", (params) => {
            if (this.debug) console.log("Edge deselected");
        });
    }

    // Método que se ejecuta cuando se selecciona un nodo
    on_node_selected(params) {
        if (this.debug) console.log("Node selected:", params);
        const nodeId = params.nodes[0]; // Obtiene el ID del nodo seleccionado
        const node = this.nodes.get(nodeId); // Obtiene los datos del nodo
        
        // Mostrar información del nodo en los campos de entrada
        document.getElementById("nodeId").value = node.id;
        document.getElementById("nodeLabel").value = node.label.split(" - ")[1];
        document.getElementById("nodeCost").value = "";
        
        // Actualiza la información en el panel lateral
        this.update_node_info(nodeId);
    }   

    // Método que se ejecuta cuando se selecciona una arista
    on_edge_selected(params) {
        if (this.debug) console.log("Edge selected:", params);
        if (params.edges.length > 0) {
            const edgeId = params.edges[0];
            const edge = this.edges.get(edgeId);
            
            // Mostrar información de la arista en los campos de entrada
            document.getElementById("edgeFrom").value = edge.from;
            document.getElementById("edgeTo").value = edge.to;
            document.getElementById("edgeLabel").value = edge.label;
        }
    }

    // Método que captura datos del evento de clic, como coordenadas y teclas presionadas
    event_data(params) {
        let original_event = params.event.srcEvent || params.event;
        let result = {
            x: params.pointer.canvas.x,
            y: params.pointer.canvas.y,
            button: original_event.button,
            alt: original_event.altKey,
            ctrl: original_event.ctrlKey,
            shift: original_event.shiftKey,
        };
        return result;
    }

    // Método que maneja los eventos de clic en el grafo
    on_click(params) {
        if (this.debug) console.log("Click event:", params);
    
        let eventdata = this.event_data(params);
    
        // Si se hace clic en un espacio vacío
        if (params.nodes.length === 0 && params.edges.length === 0) {
            if (eventdata.ctrl) {
                // Ctrl + Clic en espacio vacío: Crear nuevo nodo
                this.add_node_at_position(eventdata.x, eventdata.y);
                return;
            }
            // Clic normal en espacio vacío: Deseleccionar nodo actual
            this.selected_node = undefined;
        } 
        // Si se hace clic en un nodo
        else if (params.nodes.length > 0) {
            const nodeId = parseInt(params.nodes[0]);
            const node = this.nodes.get(nodeId);
    
            if (eventdata.shift) {
                // Shift + Clic en nodo: Eliminar nodo
                this.delete_node(nodeId);
                return;
            } 
            else if (eventdata.ctrl && this.selected_node && this.selected_node.id !== nodeId) {
                // Ctrl + Clic en otro nodo: Crear arista
                if (this.debug) console.log("Creando arista desde", this.selected_node.id, "hasta", nodeId);
                this.add_edge(this.selected_node.id, nodeId, "3");
                return;
            }
            
            // Clic normal en nodo: Actualizar el nodo seleccionado
            this.selected_node = node;
            this.update_node_info(nodeId);
        }
        // Si se hace clic en una arista
        else if (params.edges.length > 0) {
            const edgeId = params.edges[0];
    
            if (eventdata.shift) {
                // Shift + Clic en arista: Eliminar arista
                this.delete_edge_by_id(edgeId);
                return;
            }
        }
    }

    // Método para añadir un nodo en una posición específica
    add_node_at_position(x, y) {
        // Generar nuevo ID (el mayor ID actual + 1)
        const nodeIds = this.nodes.getIds();
        const newId = nodeIds.length > 0 ? Math.max(...nodeIds) + 1 : 1;
        
        // Crear etiqueta por defecto
        const label = `Nodo ${newId}`;
        
        // Añadir nodo
        this.add_node(newId, label, x, y);
    }

    // Método que permite agregar un nodo con ID y etiqueta en una posición específica
    add_node(id, label, x, y) {
        // Si no se proporciona una posición, usar una posición por defecto
        if (x === undefined || y === undefined) {
            x = 0;
            y = 0;
        }
        
        // Crear un nuevo nodo con el formato correcto para la etiqueta
        const node = { 
            id: parseInt(id), 
            label: `${id} - ${label}`, 
            x: x, 
            y: y 
        };
        
        try {
            this.nodes.add(node);
            this.is_changed = true;
            return true;
        } catch (error) {
            console.error("Error al agregar nodo:", error);
            return false;
        }
    }

    // Método que permite actualizar un nodo existente
    update_node(id, label) {
        try {
            const nodeId = parseInt(id);
            const node = this.nodes.get(nodeId);
            
            if (node) {
                // Actualizar nodo con el formato correcto para la etiqueta
                this.nodes.update({
                    id: nodeId,
                    label: `${nodeId} - ${label}`
                });
                this.is_changed = true;
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error al actualizar nodo:", error);
            return false;
        }
    }
    
    // Método para eliminar un nodo y sus conexiones
    delete_node(id) {
        try {
            const nodeId = parseInt(id);
            
            // Eliminar todas las aristas conectadas a este nodo
            const connectedEdges = this.visnetwork.getConnectedEdges(nodeId);
            this.edges.remove(connectedEdges);
            
            // Eliminar el nodo
            this.nodes.remove(nodeId);
            
            // Limpiar campos de entrada
            document.getElementById("nodeId").value = "";
            document.getElementById("nodeLabel").value = "";
            document.getElementById("nodeCost").value = "";
            
            this.selected_node = undefined;
            this.is_changed = true;
            return true;
        } catch (error) {
            console.error("Error al eliminar nodo:", error);
            return false;
        }
    }

    // Método que permite agregar una arista entre dos nodos
    add_edge(fromId, toId, label = "") {
        try {
            fromId = parseInt(fromId);
            toId = parseInt(toId);
            
            if (this.debug) console.log("Añadiendo arista:", fromId, "->", toId);
            
            // Verificar que ambos nodos existen
            const fromNode = this.nodes.get(fromId);
            const toNode = this.nodes.get(toId);
            
            if (!fromNode || !toNode) {
                console.error("Uno o ambos nodos no existen:", fromId, toId);
                return false;
            }
            
            // Verificar si ya existe una arista entre estos nodos
            const existingEdges = this.edges.get({
                filter: function(edge) {
                    return edge.from === fromId && edge.to === toId;
                }
            });
            
            if (existingEdges.length > 0) {
                console.log("Ya existe una arista entre estos nodos");
                return false;
            }
            
            // Agregar la arista con el formato correcto
            const edge = {
                from: fromId,
                to: toId,
                label: label || "",
                arrows: "to"
            };
            
            this.edges.add(edge);
            this.is_changed = true;
            return true;
        } catch (error) {
            console.error("Error al agregar arista:", error);
            return false;
        }
    }

    // Método que permite actualizar una arista existente
    update_edge(fromId, toId, label) {
        try {
            fromId = parseInt(fromId);
            toId = parseInt(toId);
            
            // Buscar la arista entre los nodos especificados
            const existingEdges = this.edges.get({
                filter: function(edge) {
                    return edge.from === fromId && edge.to === toId;
                }
            });
            
            if (existingEdges.length > 0) {
                // Actualizar la arista con el formato correcto
                this.edges.update({
                    id: existingEdges[0].id,
                    label: label
                });
                this.is_changed = true;
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error al actualizar arista:", error);
            return false;
        }
    }

    // Método para eliminar una arista
    delete_edge(fromId, toId) {
        try {
            fromId = parseInt(fromId);
            toId = parseInt(toId);
            
            // Buscar la arista entre los nodos especificados
            const existingEdges = this.edges.get({
                filter: function(edge) {
                    return edge.from === fromId && edge.to === toId;
                }
            });
            
            if (existingEdges.length > 0) {
                // Eliminar la arista
                this.edges.remove(existingEdges[0].id);
                this.is_changed = true;
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error al eliminar arista:", error);
            return false;
        }
    }

    // Método para eliminar una arista por su ID
    delete_edge_by_id(edgeId) {
        try {
            // Eliminar la arista por ID
            this.edges.remove(edgeId);
            
            // Limpiar campos de entrada
            document.getElementById("edgeFrom").value = "";
            document.getElementById("edgeTo").value = "";
            document.getElementById("edgeLabel").value = "";
            
            this.is_changed = true;
            return true;
        } catch (error) {
            console.error("Error al eliminar arista:", error);
            return false;
        }
    }

    // Método que obtiene los prerrequisitos (nodos que apuntan a este nodo)
    get_prerequisitos(nodeId) {
        nodeId = parseInt(nodeId);
        const edges = this.edges.get({
            filter: function(edge) {
                return edge.to === nodeId;
            }
        });
        
        return edges.map(edge => edge.from);
    }

    // Método que obtiene los postrequisitos (nodos a los que apunta este nodo)
    get_postrequisitos(nodeId) {
        nodeId = parseInt(nodeId);
        const edges = this.edges.get({
            filter: function(edge) {
                return edge.from === nodeId;
            }
        });
        
        return edges.map(edge => edge.to);
    }
    
    // Método que actualiza la información mostrada de un nodo
    update_node_info(nodeId) {
        nodeId = parseInt(nodeId);
        const node = this.nodes.get(nodeId);
        
        // Obtener prerrequisitos y postrequisitos
        const prerrequisitos = this.get_prerequisitos(nodeId);
        const postrequisitos = this.get_postrequisitos(nodeId);
        
        // Mostrar información del nodo
        let info = `<strong>ID:</strong> ${node.id}<br>`;
        info += `<strong>Nombre:</strong> ${node.label.split(" - ")[1]}<br>`;
        
        // Mostrar prerrequisitos
        if (prerrequisitos.length > 0) {
            info += "<strong>Prerrequisitos:</strong><br>";
            prerrequisitos.forEach(preId => {
                const preNode = this.nodes.get(preId);
                info += `- ${preNode.label}<br>`;
            });
        } else {
            info += "<strong>Prerrequisitos:</strong> Ninguno<br>";
        }
        
        // Mostrar postrequisitos
        if (postrequisitos.length > 0) {
            info += "<strong>Postrequisitos:</strong><br>";
            postrequisitos.forEach(postId => {
                const postNode = this.nodes.get(postId);
                info += `- ${postNode.label}<br>`;
            });
        } else {
            info += "<strong>Postrequisitos:</strong> Ninguno<br>";
        }
        
        document.getElementById("nodeInfo").innerHTML = info;
    }

    // Implementación del algoritmo de Dijkstra para encontrar la ruta más corta
    find_shortest_path(startNodeId, endNodeId) {
        startNodeId = parseInt(startNodeId);
        endNodeId = parseInt(endNodeId);
        
        // Verificar que los nodos existen
        if (!this.nodes.get(startNodeId) || !this.nodes.get(endNodeId)) {
            console.error("Nodo de inicio o fin no existe");
            return null;
        }
        
        // Inicializar distancias y nodos visitados
        const distances = {};
        const previous = {};
        const unvisited = new Set();
        
        // Inicializar todas las distancias como infinito
        this.nodes.getIds().forEach(nodeId => {
            distances[nodeId] = Infinity;
            previous[nodeId] = null;
            unvisited.add(nodeId);
        });
        
        // La distancia desde el nodo inicial a sí mismo es 0
        distances[startNodeId] = 0;
        
        // Mientras haya nodos sin visitar
        while (unvisited.size > 0) {
            // Encontrar el nodo no visitado con la menor distancia
            let currentNodeId = null;
            let minDistance = Infinity;
            
            unvisited.forEach(nodeId => {
                if (distances[nodeId] < minDistance) {
                    minDistance = distances[nodeId];
                    currentNodeId = nodeId;
                }
            });
            
            // Si no hay más caminos o llegamos al destino, terminamos
            if (currentNodeId === null || currentNodeId === endNodeId) {
                break;
            }
            
            // Quitar el nodo actual de los no visitados
            unvisited.delete(currentNodeId);
            
            // Obtener todas las aristas desde el nodo actual
            const edges = this.edges.get({
                filter: function(edge) {
                    return edge.from === currentNodeId;
                }
            });
            
            // Para cada vecino, calcular la distancia desde el nodo actual
            edges.forEach(edge => {
                const neighborId = edge.to;
                
                // Obtener el peso/costo de la arista
                const weight = parseInt(edge.label.replace('C', '')) || 1;
                
                // Calcular nueva distancia potencial
                const distanceToNeighbor = distances[currentNodeId] + weight;
                
                // Si encontramos una ruta más corta al vecino, actualizar
                if (distanceToNeighbor < distances[neighborId]) {
                    distances[neighborId] = distanceToNeighbor;
                    previous[neighborId] = currentNodeId;
                }
            });
        }
        
        // Construir la ruta desde el final hacia el principio
        const path = [];
        let current = endNodeId;
        
        // Si no hay camino, retornar null
        if (previous[endNodeId] === null && endNodeId !== startNodeId) {
            return null;
        }
        
        // Reconstruir el camino
        while (current !== null) {
            path.unshift(current);
            current = previous[current];
        }
        
        return {
            path: path,
            distance: distances[endNodeId]
        };
    }

    // Método para encontrar la ruta más larga (usando el algoritmo de Dijkstra modificado)
    find_longest_path() {
        let maxDistance = -1;
        let longestPath = null;
        let startNode = null;
        let endNode = null;
        
        // Probar todas las combinaciones posibles de nodos
        const nodeIds = this.nodes.getIds();
        
        for (let i = 0; i < nodeIds.length; i++) {
            for (let j = 0; j < nodeIds.length; j++) {
                if (i !== j) {
                    const result = this.find_all_paths(nodeIds[i], nodeIds[j]);
                    if (result && result.length > 0) {
                        // Encontrar el camino más largo de todos los posibles
                        result.forEach(path => {
                            const distance = this.calculate_path_distance(path);
                            if (distance > maxDistance) {
                                maxDistance = distance;
                                longestPath = path;
                                startNode = nodeIds[i];
                                endNode = nodeIds[j];
                            }
                        });
                    }
                }
            }
        }
        
        return {
            path: longestPath,
            distance: maxDistance,
            start: startNode,
            end: endNode
        };
    }

    // Método auxiliar para encontrar todos los caminos posibles entre dos nodos (DFS)
    find_all_paths(startNodeId, endNodeId, path = [], visited = {}) {
        startNodeId = parseInt(startNodeId);
        endNodeId = parseInt(endNodeId);
        
        // Crear una copia del camino actual y marcar este nodo como visitado
        const currentPath = [...path, startNodeId];
        const currentVisited = {...visited, [startNodeId]: true};
        
        // Si llegamos al nodo final, retornamos este camino
        if (startNodeId === endNodeId) {
            return [currentPath];
        }
        
        // Buscar todos los nodos conectados no visitados
        const edges = this.edges.get({
            filter: function(edge) {
                return edge.from === startNodeId && !visited[edge.to];
            }
        });
        
        // Si no hay más caminos, retornamos vacío
        if (edges.length === 0) {
            return [];
        }
        
        // Reunir todos los caminos desde los nodos conectados
        let allPaths = [];
        edges.forEach(edge => {
            const paths = this.find_all_paths(edge.to, endNodeId, currentPath, currentVisited);
            allPaths = allPaths.concat(paths);
        });
        
        return allPaths;
    }

    // Método para calcular la distancia total de un camino
    calculate_path_distance(path) {
        let distance = 0;
        
        for (let i = 0; i < path.length - 1; i++) {
            const edges = this.edges.get({
                filter: function(edge) {
                    return edge.from === path[i] && edge.to === path[i + 1];
                }
            });
            
            if (edges.length > 0) {
                const weight = parseInt(edges[0].label.replace('C', '')) || 1;
                distance += weight;
            }
        }
        
        return distance;
    }

    // Método para colorear una ruta en el grafo
    color_path(path, edgeColor, nodeColor) {
        // Si no hay camino, no hacer nada
        if (!path || path.length <= 1) {
            return false;
        }
        
        // Colorear los nodos del camino
        path.forEach(nodeId => {
            const node = this.nodes.get(nodeId);
            this.nodes.update({
                id: nodeId,
                color: {
                    background: nodeColor,
                    border: '#000000'
                }
            });
        });
        
        // Colorear las aristas del camino
        for (let i = 0; i < path.length - 1; i++) {
            const edges = this.edges.get({
                filter: function(edge) {
                    return edge.from === path[i] && edge.to === path[i + 1];
                }
            });
            
            if (edges.length > 0) {
                this.edges.update({
                    id: edges[0].id,
                    color: {
                        color: edgeColor,
                        highlight: edgeColor
                    },
                    width: 3
                });
            }
        }
        
        return true;
    }

    // Método para restablecer los colores originales del grafo
    reset_colors() {
        // Resetear colores de nodos
        this.nodes.getIds().forEach(nodeId => {
            this.nodes.update({
                id: nodeId,
                color: {
                    background: undefined,
                    border: undefined,
                    highlight: undefined
                }
            });
        });
        
        // Resetear colores de aristas
        this.edges.getIds().forEach(edgeId => {
            this.edges.update({
                id: edgeId,
                color: {
                    color: undefined,
                    highlight: undefined
                },
                width: 2
            });
        });
    }

    // Método para destacar la ruta más corta y la ruta más larga
    highlight_paths(startNodeId, endNodeId) {
        // Primero, restablecer todos los colores
        this.reset_colors();
        
        // Buscar y colorear la ruta más corta
        const shortestPath = this.find_shortest_path(startNodeId, endNodeId);
        if (shortestPath) {
            this.color_path(shortestPath.path, '#00aa00', '#aaffaa'); // Verde
            console.log("Ruta más corta:", shortestPath);
        }
        
        // Buscar y colorear la ruta más larga
        const longestPathInfo = this.find_longest_path();
        if (longestPathInfo && longestPathInfo.path) {
            this.color_path(longestPathInfo.path, '#aa0000', '#ffaaaa'); // Rojo
            console.log("Ruta más larga:", longestPathInfo);
        }
        
        return {
            shortestPath: shortestPath,
            longestPath: longestPathInfo
        };
    }

    // Método para guardar las posiciones de los nodos
    save_positions() {
        this.visnetwork.storePositions();
        const nodePositions = this.nodes.get().map(({ id, x, y, label }) => ({ 
            id, 
            x, 
            y, 
            label 
        }));
        return JSON.stringify(nodePositions);
    }

    // Método para exportar todo el grafo (nodos y aristas)
    export_graph() {
        this.visnetwork.storePositions();
        const nodes = this.nodes.get();
        const edges = this.edges.get();
        
        return JSON.stringify({
            nodes: nodes,
            edges: edges
        });
    }

    // Método para cargar un grafo guardado previamente
    load_graph(jsonString) {
        try {
            const graph = JSON.parse(jsonString);
            
            // Limpiar el grafo actual
            this.nodes.clear();
            this.edges.clear();
            
            // Cargar los nodos con sus posiciones
            if (graph.nodes && Array.isArray(graph.nodes)) {
                this.nodes.add(graph.nodes);
            }
            
            // Cargar las aristas
            if (graph.edges && Array.isArray(graph.edges)) {
                this.edges.add(graph.edges);
            }
            
            this.is_changed = true;
            return true;
        } catch (error) {
            console.error("Error al cargar el grafo:", error);
            return false;
        }
    }

    // Método para cargar solo las posiciones de los nodos
    load_positions(jsonString) {
        try {
            const positions = JSON.parse(jsonString);
            
            // Actualizar las posiciones de los nodos existentes
            positions.forEach(pos => {
                this.nodes.update({
                    id: pos.id,
                    x: pos.x,
                    y: pos.y
                });
            });
            
            return true;
        } catch (error) {
            console.error("Error al cargar las posiciones:", error);
            return false;
        }
    }

    // Método para mostrar la matriz de adyacencia
mostrarMatriz1() {
    const tabla = document.getElementById("tabla");
    tabla.innerHTML = "";

    const nodesList = this.nodes.get();

    // Crear fila de encabezado con los nodos
    let headerRow = tabla.insertRow(-1);
    let headerCell = document.createElement("th");
    headerCell.innerHTML = "Nodos"; 
    headerCell.style.fontWeight = 'bold'; 
    headerCell.style.backgroundColor = '#e0e0e0';
    headerRow.appendChild(headerCell);

    // Añadir cada nodo como encabezado de columna
    nodesList.forEach(node => {
        let cell = document.createElement("th");
        cell.innerHTML = node.label; 
        cell.style.fontWeight = 'bold'; 
        cell.style.backgroundColor = '#e0e0e0';
        headerRow.appendChild(cell);
    });

    // Para cada nodo de origen, crear una fila
    nodesList.forEach(fromNode => {
        let fila = tabla.insertRow(-1);
        let cell = fila.insertCell(-1);
        cell.innerHTML = fromNode.label;
        cell.style.fontWeight = 'bold'; 
        cell.style.backgroundColor = '#e0e0e0';

        // Para cada nodo destino, comprobar si existe conexión
        nodesList.forEach(toNode => {
            let celda = fila.insertCell(-1);
            // Buscar si existe una arista desde fromNode a toNode
            const edgeval = this.edges.get({
                filter: function(edge) {
                    return edge.from === fromNode.id && edge.to === toNode.id;
                }
            })[0];
            // Si existe la arista, mostrar su valor, si no un 0
            celda.innerHTML = edgeval ? edgeval.label : "0";
        });
    });

    tabla.style.display = "table";
    tabla.style.borderCollapse = "collapse";
    tabla.style.margin = "10px 0";
    
    // Aplicar estilos a las celdas de la tabla
    const celdas = tabla.getElementsByTagName("td");
    for (let i = 0; i < celdas.length; i++) {
        celdas[i].style.border = "1px solid #ddd";
        celdas[i].style.padding = "8px";
        celdas[i].style.textAlign = "center";
    }
    
    const encabezados = tabla.getElementsByTagName("th");
    for (let i = 0; i < encabezados.length; i++) {
        encabezados[i].style.border = "1px solid #ddd";
        encabezados[i].style.padding = "8px";
        encabezados[i].style.textAlign = "center";
    }
}

// Método para mostrar la matriz de incidencia
mostrarMatriz2() {
    const tabla = document.getElementById("tabla");
    tabla.innerHTML = "";
    
    const edgesList = this.edges.get(); 
    const nodesList = this.nodes.get(); 

    // Crear fila de encabezado
    const headerRow = tabla.insertRow(-1);

    // Añadir celda de esquina superior izquierda
    let headerCell = document.createElement("th");
    headerCell.innerHTML = "Nodos/Aristas"; 
    headerCell.style.fontWeight = 'bold'; 
    headerCell.style.backgroundColor = '#e0e0e0';
    headerRow.appendChild(headerCell);

    // Añadir cada arista como encabezado de columna
    for (let i = 0; i < edgesList.length; i++) {
        const edge = edgesList[i];
        const headerCell = document.createElement("th");
        headerRow.appendChild(headerCell);
        const sourceNode = this.nodes.get(edge.from);
        const targetNode = this.nodes.get(edge.to);
        headerCell.innerHTML = `${sourceNode.id}→${targetNode.id}`;
        headerCell.style.fontWeight = 'bold'; 
        headerCell.style.backgroundColor = '#e0e0e0';
    }

    // Para cada nodo, crear una fila
    for (let node of nodesList) {
        const row = tabla.insertRow(-1);
        const nodeCell = row.insertCell(-1);
        nodeCell.innerHTML = node.label;
        nodeCell.style.fontWeight = 'bold'; 
        nodeCell.style.backgroundColor = '#e0e0e0'; 

        // Para cada arista, comprobar la relación con el nodo
        for (let edge of edgesList) {
            const cell = row.insertCell(-1);
            if (edge.from === node.id) {
                cell.innerHTML = `1, ${edge.label}`; // Nodo es origen de la arista
            } else if (edge.to === node.id) {
                cell.innerHTML = `-1, ${edge.label}`; // Nodo es destino de la arista
            } else {
                cell.innerHTML = "0"; // Nodo no está relacionado con la arista
            }
            cell.style.textAlign = "center";
        }
    }
    
    tabla.style.display = "table";
    tabla.style.borderCollapse = "collapse";
    tabla.style.margin = "10px 0";
    
    // Aplicar estilos a las celdas de la tabla
    const celdas = tabla.getElementsByTagName("td");
    for (let i = 0; i < celdas.length; i++) {
        celdas[i].style.border = "1px solid #ddd";
        celdas[i].style.padding = "8px";
        celdas[i].style.textAlign = "center";
    }
    
    const encabezados = tabla.getElementsByTagName("th");
    for (let i = 0; i < encabezados.length; i++) {
        encabezados[i].style.border = "1px solid #ddd";
        encabezados[i].style.padding = "8px";
        encabezados[i].style.textAlign = "center";
    }
}
}
