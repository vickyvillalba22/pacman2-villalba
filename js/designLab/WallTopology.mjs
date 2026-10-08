const WALL = '#';

const DIRECTIONS = Object.freeze({
   top: 1,
   right: 2,
   bottom: 4,
   left: 8
});

export default class WallTopology {
   static isWall(board, row, column) {
      return board[row]?.[column] === WALL;
   }

   static getWallMask(board, row, column) {
      if (!this.isWall(board, row, column)) {
         return 0;
      }

      let mask = 0;
      if (this.isWall(board, row - 1, column)) mask |= DIRECTIONS.top;
      if (this.isWall(board, row, column + 1)) mask |= DIRECTIONS.right;
      if (this.isWall(board, row + 1, column)) mask |= DIRECTIONS.bottom;
      if (this.isWall(board, row, column - 1)) mask |= DIRECTIONS.left;
      return mask;
   }

   static getWallInfo(board, row, column) {
      const mask = this.getWallMask(board, row, column);

      return {
         row,
         column,
         mask,
         top: Boolean(mask & DIRECTIONS.top),
         right: Boolean(mask & DIRECTIONS.right),
         bottom: Boolean(mask & DIRECTIONS.bottom),
         left: Boolean(mask & DIRECTIONS.left),
         exposedTop: !Boolean(mask & DIRECTIONS.top),
         exposedRight: !Boolean(mask & DIRECTIONS.right),
         exposedBottom: !Boolean(mask & DIRECTIONS.bottom),
         exposedLeft: !Boolean(mask & DIRECTIONS.left)
      };
   }

   static getWallInfoList(board) {
      const walls = [];

      board.forEach((row, rowIndex) => {
         [...row].forEach((tile, columnIndex) => {
            if (tile === WALL) {
               walls.push(this.getWallInfo(board, rowIndex, columnIndex));
            }
         });
      });

      return walls;
   }
}

export { DIRECTIONS };
