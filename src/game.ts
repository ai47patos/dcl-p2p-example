import { getUserData } from '@decentraland/Identity'

function makeRandomId(length: number) {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}

@Component("ColorComponent")
class ColorComponent {
  indexCube: number     //Index of the entity in the cube array
  entity: IEntity       //Entity reference
  material: Material    //Material reference
  colorArray: Color3[]  //The color options to choose
  currentColor: number  //The index of the current color
  constructor(entity: IEntity, arrayIndex: number){
    this.entity = entity
    this.indexCube = arrayIndex
    this.colorArray = [Color3.White(), Color3.Blue(), Color3.Red(), Color3.Green(), Color3.Black()]
    this.material = new Material()
    this.entity.addComponent(this.material)
    this.updateColor(0)
    var self = this
    this.entity.addComponent(new OnPointerDown(
        function () {
          self.nextColorFromLocalPlayer()
        },
        {
          button: ActionButton.PRIMARY,
          hoverText: "Change color",
          distance: 8
        }
      )
    )
  }
  //Update the color
  updateColor(newColorIndex: number){
    this.currentColor = newColorIndex
    this.material.albedoColor = this.colorArray[newColorIndex]
  }
  //Update the color by local the player
  nextColorFromLocalPlayer(){
    let newIndex = this.currentColor+1
    if (newIndex>=this.colorArray.length) {
      newIndex = 0
    }
    this.updateColor(newIndex)
    let message: P2PMessage = {
      playerId: selfPlayerId,
      cubeData:[{
        indexCube: this.indexCube,
        cubeColorIndex: newIndex
      }],
    }
    sceneMessageBus.emit("cubeupdate", message)
  }
  //Update the color by another player via P2P message
  updateColorFromP2P(newColorIndex: number){
    this.updateColor(newColorIndex)
  }
}

/// --- Spawner function ---
function spawnCube(x: number, y: number, z: number) {
  // create the entity
  const cube = new Entity()

  // add a transform to the entity
  cube.addComponent(new Transform({ position: new Vector3(x, y, z) }))

  // add a shape to the entity
  cube.addComponent(new BoxShape())

  // add the entity to the engine
  engine.addEntity(cube)

  return cube
}

/// --- Spawn a cube ---
var cubeArray = [
  spawnCube(8, 1, 8),
  spawnCube(5, 1, 8),
  spawnCube(11, 1, 8)
]
cubeArray[0].addComponent(new ColorComponent(cubeArray[0], 0))
cubeArray[1].addComponent(new ColorComponent(cubeArray[1], 1))
cubeArray[2].addComponent(new ColorComponent(cubeArray[2], 2))

//Cube state info for P2P
type CubeState = {
  indexCube: number,         //Index of the cube in the array
  cubeColorIndex?: number,   //Opcional, if present change the color of the cube
  cubePosition?: Vector3,   //Opcional, if present change the position of the cube
}

//P2P message struct
type P2PMessage = {
  playerId: string,         //Unique player ID of the emmiter of the message
  cubeData?: CubeState[],   //Array of CubeStates to modify
}

//Load cube state from a P2P message
function loadCubeState(state: CubeState){
  //Find the cube to update
  if (cubeArray[state.indexCube]) {
    const cube = cubeArray[state.indexCube]
    //If a color index was recived, change its color
    if(state.hasOwnProperty('cubeColorIndex')){
      if (cube.hasComponent(ColorComponent)) {
        cube.getComponent(ColorComponent).updateColorFromP2P(state.cubeColorIndex)
      }
    }
    //If a position was recived, change it
    if(state.hasOwnProperty('cubePosition')){
      if (cube.hasComponent(Transform)) {
        cube.getComponent(Transform).position = state.cubePosition
      }
    }
  }
}
//Our own player ID, must be unique
var selfPlayerId: string
//Load user name/id
executeTask(async () => {
    try {
      const userData = await getUserData()
      selfPlayerId = userData.displayName
    } catch (error) {
      selfPlayerId = makeRandomId(5)
      log(error.toString())
    }
})

//Decentraland P2P sync
const sceneMessageBus = new MessageBus()

//Catch "cubeupdate" emmited messages
sceneMessageBus.on("cubeupdate", (info: P2PMessage) => {
  //Check the emmiter of the message isn't yourself
  if (info.playerId!=selfPlayerId) {
    if (info.cubeData) {
      //Load every recived CubeState in the message
      for (let i = 0; i < info.cubeData.length; i++) {
        loadCubeState(info.cubeData[i])
      }
    }
  }
});
