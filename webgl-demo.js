var coordinates = []
var positions = []
noise.seed(Math.random());
var frame = 0;

const grid_x = 100
const grid_y = 100

const size_x = 5
const size_y = 5

main()

function main() {

    const gl = prepareCanvas()
    const programInfo = prepareProgram(gl)
    
    preparePoints()
    
    var buffers = initBuffers(gl)

    function render() {
        frame++;
        buffers = movePoints(gl, buffers)
        drawScene(gl, programInfo, buffers)
        requestAnimationFrame(render)
    }
    requestAnimationFrame(render)
}

function preparePoints() {
    coordinates = new Array(grid_x * grid_y)
    var i = 0

    for (var y=0; y<grid_y; y++) {
        for (var x=0; x<grid_x; x++) {
            coordinates[i] = {
                x: (x - (grid_x-1)/2) / grid_x * size_x,
                y: ((grid_y-1)/2 - y) / grid_y * size_y,
                z: 0
            }
            i++
        }
    }

    return 
}

function prepareCanvas() {
    const canvas = document.querySelector('#glcanvas')
    const gl = canvas.getContext('webgl', {antialias:false}) || canvas.getContext('experimental-webgl')

    if (!gl) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.')
        return
    }

    return gl
}

function prepareProgram(gl) {

    const vertex_shader_source = `
        attribute vec4 aVertexPosition;
        attribute vec4 aVertexColor;

        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;

        varying lowp vec4 vColor;

        void main(void) {
            gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
            vColor = aVertexColor;
        }
    `

    const fragment_shader_source = `
        varying lowp vec4 vColor;

        void main(void) {
            gl_FragColor = vColor;
        }
    `

    const shaderProgram = initShaderProgram(gl, vertex_shader_source, fragment_shader_source)

    return {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        },
    }

}

function coordinatesToPositions() {

    positions = new Array(size_x * size_y * 3)

    for (var i=0; i<coordinates.length; i++) {
        positions[3*i+0] = coordinates[i].x
        positions[3*i+1] = coordinates[i].y
        positions[3*i+2] = coordinates[i].z
    }

    return
}

function initBuffers(gl) {

    // Positions
    coordinatesToPositions()

    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)


    // Colors
    var colors = new Array(positions.length / 3 * 4).fill(1)

    const colorBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW)

    
    // Indices
    var indices = new Array( (grid_x-1) * (grid_y-1) * 12 )
    console.log(indices.length)
    var j = 0
    var i = 0

    for (var y=0; y<grid_y-1; y++) {
        for (var x=0; x<grid_x-1; x++) {
            i = y * grid_y + x

            indices[j+0] = i
            indices[j+1] = i+1
            indices[j+2] = i+1
            indices[j+3] = i+grid_y
            indices[j+4] = i+grid_y
            indices[j+5] = i
            indices[j+6] = i+1
            indices[j+7] = i+grid_y
            indices[j+8] = i+grid_y
            indices[j+9] = i+grid_y+1
            indices[j+10] = i+grid_y+1
            indices[j+11] = i+1

            j+=12
        }
    }
    const indexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)


    return {
        position: positionBuffer,
        color: colorBuffer,
        indices: indexBuffer,
    }
}

function movePoints(gl, buffers) {

    for (var i=0; i<coordinates.length; i++) {
        coordinates[i].z = noise.simplex2(coordinates[i].x + frame/200, coordinates[i].y + frame/200)/4
        positions[3*i+2] = coordinates[i].z
    }

    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)

    return {
        position: positionBuffer,
        color: buffers.color,
        indices: buffers.indices,
    }

}

function drawScene(gl, programInfo, buffers) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0)
    gl.clearDepth(1.0)
    gl.enable(gl.DEPTH_TEST)
    gl.depthFunc(gl.LEQUAL)

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    const fieldOfView = 45 * Math.PI / 180
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight
    const zNear = 0.1
    const zFar = 100.0
    const projectionMatrix = mat4.create()

    mat4.perspective(projectionMatrix,
                     fieldOfView,
                     aspect,
                     zNear,
                     zFar)

    const modelViewMatrix = mat4.create()

    mat4.translate(modelViewMatrix,
                   modelViewMatrix,
                   [-0.0, 0.0, -6.0])

    mat4.rotate(modelViewMatrix,  // destination matrix
                modelViewMatrix,  // matrix to rotate
                -Math.PI/4,     // amount to rotate in radians
                [1, 0, 0]);       // axis to rotate around (Z)

    {
        const numComponents = 3
        const type = gl.FLOAT
        const normalize = false
        const stride = 0
        const offset = 0
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position)
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset)
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition)
    }

    {
        const numComponents = 4
        const type = gl.FLOAT
        const normalize = false
        const stride = 0
        const offset = 0
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color)
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexColor,
            numComponents,
            type,
            normalize,
            stride,
            offset)
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor)
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices)
    
    gl.useProgram(programInfo.program)

    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix)
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix)

    {
        const vertexCount = 12 * (grid_x-1) * (grid_y-1)
        const type = gl.UNSIGNED_SHORT
        const offset = 0
        gl.drawElements(gl.LINES, vertexCount, type, offset)
    }

}

function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource)
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource)

    const shaderProgram = gl.createProgram()
    gl.attachShader(shaderProgram, vertexShader)
    gl.attachShader(shaderProgram, fragmentShader)
    gl.linkProgram(shaderProgram)

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram))
        return null
    }

    return shaderProgram
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type)

    gl.shaderSource(shader, source)

    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
    }

    return shader
}
