/**
 * Cesium - https://github.com/AnalyticalGraphicsInc/cesium
 *
 * Copyright 2011-2017 Cesium Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Columbus View (Pat. Pend.)
 *
 * Portions licensed separately.
 * See https://github.com/AnalyticalGraphicsInc/cesium/blob/master/LICENSE.md for full licensing details.
 */
define(['exports', './when-0488ac89', './Math-a09b4ca4', './Cartesian2-e22df635', './Transforms-6adeead3', './ComponentDatatype-9fd090e4', './AttributeCompression-3fc96685'], function (exports, when, _Math, Cartesian2, Transforms, ComponentDatatype, AttributeCompression) { 'use strict';

    /**
         * This enumerated type is used to determine how the vertices of the terrain mesh are compressed.
         *
         * @exports TerrainQuantization
         *
         * @private
         */
        var TerrainQuantization = {
            /**
             * The vertices are not compressed.
             *
             * @type {Number}
             * @constant
             */
            NONE : 0,

            /**
             * The vertices are compressed to 12 bits.
             *
             * @type {Number}
             * @constant
             */
            BITS12 : 1
        };
    var TerrainQuantization$1 = when.freezeObject(TerrainQuantization);

    var cartesian3Scratch = new Cartesian2.Cartesian3();
        var cartesian3DimScratch = new Cartesian2.Cartesian3();
        var cartesian2Scratch = new Cartesian2.Cartesian2();
        var matrix4Scratch = new Transforms.Matrix4();
        var matrix4Scratch2 = new Transforms.Matrix4();

        var SHIFT_LEFT_12 = Math.pow(2.0, 12.0);

        /**
         * Data used to quantize and pack the terrain mesh. The position can be unpacked for picking and all attributes
         * are unpacked in the vertex shader.
         *
         * @alias TerrainEncoding
         * @constructor
         *
         * @param {AxisAlignedBoundingBox} axisAlignedBoundingBox The bounds of the tile in the east-north-up coordinates at the tiles center.
         * @param {Number} minimumHeight The minimum height.
         * @param {Number} maximumHeight The maximum height.
         * @param {Matrix4} fromENU The east-north-up to fixed frame matrix at the center of the terrain mesh.
         * @param {Boolean} hasVertexNormals If the mesh has vertex normals.
         * @param {Boolean} [hasWebMercatorT=false] true if the terrain data includes a Web Mercator texture coordinate; otherwise, false.
         *
         * @private
         */
        function TerrainEncoding(axisAlignedBoundingBox, minimumHeight, maximumHeight, fromENU, hasVertexNormals, hasWebMercatorT) {
            var quantization = TerrainQuantization$1.NONE;
            var center;
            var toENU;
            var matrix;

            if (when.defined(axisAlignedBoundingBox) && when.defined(minimumHeight) && when.defined(maximumHeight) && when.defined(fromENU)) {
                var minimum = axisAlignedBoundingBox.minimum;
                var maximum = axisAlignedBoundingBox.maximum;

                var dimensions = Cartesian2.Cartesian3.subtract(maximum, minimum, cartesian3DimScratch);
                var hDim = maximumHeight - minimumHeight;
                var maxDim = Math.max(Cartesian2.Cartesian3.maximumComponent(dimensions), hDim);

                if (maxDim < SHIFT_LEFT_12 - 1.0) {
                    quantization = TerrainQuantization$1.BITS12;
                } else {
                    quantization = TerrainQuantization$1.NONE;
                }

                center = axisAlignedBoundingBox.center;
                toENU = Transforms.Matrix4.inverseTransformation(fromENU, new Transforms.Matrix4());

                var translation = Cartesian2.Cartesian3.negate(minimum, cartesian3Scratch);
                Transforms.Matrix4.multiply(Transforms.Matrix4.fromTranslation(translation, matrix4Scratch), toENU, toENU);

                var scale = cartesian3Scratch;
                scale.x = 1.0 / dimensions.x;
                scale.y = 1.0 / dimensions.y;
                scale.z = 1.0 / dimensions.z;
                Transforms.Matrix4.multiply(Transforms.Matrix4.fromScale(scale, matrix4Scratch), toENU, toENU);

                matrix = Transforms.Matrix4.clone(fromENU);
                Transforms.Matrix4.setTranslation(matrix, Cartesian2.Cartesian3.ZERO, matrix);

                fromENU = Transforms.Matrix4.clone(fromENU, new Transforms.Matrix4());

                var translationMatrix = Transforms.Matrix4.fromTranslation(minimum, matrix4Scratch);
                var scaleMatrix =  Transforms.Matrix4.fromScale(dimensions, matrix4Scratch2);
                var st = Transforms.Matrix4.multiply(translationMatrix, scaleMatrix,matrix4Scratch);

                Transforms.Matrix4.multiply(fromENU, st, fromENU);
                Transforms.Matrix4.multiply(matrix, st, matrix);
            }

            /**
             * How the vertices of the mesh were compressed.
             * @type {TerrainQuantization}
             */
            this.quantization = quantization;

            /**
             * The minimum height of the tile including the skirts.
             * @type {Number}
             */
            this.minimumHeight = minimumHeight;

            /**
             * The maximum height of the tile.
             * @type {Number}
             */
            this.maximumHeight = maximumHeight;

            /**
             * The center of the tile.
             * @type {Cartesian3}
             */
            this.center = center;

            /**
             * A matrix that takes a vertex from the tile, transforms it to east-north-up at the center and scales
             * it so each component is in the [0, 1] range.
             * @type {Matrix4}
             */
            this.toScaledENU = toENU;

            /**
             * A matrix that restores a vertex transformed with toScaledENU back to the earth fixed reference frame
             * @type {Matrix4}
             */
            this.fromScaledENU = fromENU;

            /**
             * The matrix used to decompress the terrain vertices in the shader for RTE rendering.
             * @type {Matrix4}
             */
            this.matrix = matrix;

            /**
             * The terrain mesh contains normals.
             * @type {Boolean}
             */
            this.hasVertexNormals = hasVertexNormals;

            /**
             * The terrain mesh contains a vertical texture coordinate following the Web Mercator projection.
             * @type {Boolean}
             */
            this.hasWebMercatorT = when.defaultValue(hasWebMercatorT, false);
        }

        TerrainEncoding.prototype.encode = function(vertexBuffer, bufferIndex, position, uv, height, normalToPack, webMercatorT) {
            var u = uv.x;
            var v = uv.y;

            if (this.quantization === TerrainQuantization$1.BITS12) {
                position = Transforms.Matrix4.multiplyByPoint(this.toScaledENU, position, cartesian3Scratch);

                position.x = _Math.CesiumMath.clamp(position.x, 0.0, 1.0);
                position.y = _Math.CesiumMath.clamp(position.y, 0.0, 1.0);
                position.z = _Math.CesiumMath.clamp(position.z, 0.0, 1.0);

                var hDim = this.maximumHeight - this.minimumHeight;
                var h = _Math.CesiumMath.clamp((height - this.minimumHeight) / hDim, 0.0, 1.0);

                Cartesian2.Cartesian2.fromElements(position.x, position.y, cartesian2Scratch);
                var compressed0 = AttributeCompression.AttributeCompression.compressTextureCoordinates(cartesian2Scratch);

                Cartesian2.Cartesian2.fromElements(position.z, h, cartesian2Scratch);
                var compressed1 = AttributeCompression.AttributeCompression.compressTextureCoordinates(cartesian2Scratch);

                Cartesian2.Cartesian2.fromElements(u, v, cartesian2Scratch);
                var compressed2 = AttributeCompression.AttributeCompression.compressTextureCoordinates(cartesian2Scratch);

                vertexBuffer[bufferIndex++] = compressed0;
                vertexBuffer[bufferIndex++] = compressed1;
                vertexBuffer[bufferIndex++] = compressed2;

                if (this.hasWebMercatorT) {
                    Cartesian2.Cartesian2.fromElements(webMercatorT, 0.0, cartesian2Scratch);
                    var compressed3 = AttributeCompression.AttributeCompression.compressTextureCoordinates(cartesian2Scratch);
                    vertexBuffer[bufferIndex++] = compressed3;
                }
            } else {
                Cartesian2.Cartesian3.subtract(position, this.center, cartesian3Scratch);

                vertexBuffer[bufferIndex++] = cartesian3Scratch.x;
                vertexBuffer[bufferIndex++] = cartesian3Scratch.y;
                vertexBuffer[bufferIndex++] = cartesian3Scratch.z;
                vertexBuffer[bufferIndex++] = height;
                vertexBuffer[bufferIndex++] = u;
                vertexBuffer[bufferIndex++] = v;

                if (this.hasWebMercatorT) {
                    vertexBuffer[bufferIndex++] = webMercatorT;
                }
            }

            if (this.hasVertexNormals) {
                vertexBuffer[bufferIndex++] = AttributeCompression.AttributeCompression.octPackFloat(normalToPack);
            }

            return bufferIndex;
        };

        TerrainEncoding.prototype.decodePosition = function(buffer, index, result) {
            if (!when.defined(result)) {
                result = new Cartesian2.Cartesian3();
            }

            index *= this.getStride();

            if (this.quantization === TerrainQuantization$1.BITS12) {
                var xy = AttributeCompression.AttributeCompression.decompressTextureCoordinates(buffer[index], cartesian2Scratch);
                result.x = xy.x;
                result.y = xy.y;

                var zh = AttributeCompression.AttributeCompression.decompressTextureCoordinates(buffer[index + 1], cartesian2Scratch);
                result.z = zh.x;

                return Transforms.Matrix4.multiplyByPoint(this.fromScaledENU, result, result);
            }

            result.x = buffer[index];
            result.y = buffer[index + 1];
            result.z = buffer[index + 2];
            return Cartesian2.Cartesian3.add(result, this.center, result);
        };

        TerrainEncoding.prototype.decodeTextureCoordinates = function(buffer, index, result) {
            if (!when.defined(result)) {
                result = new Cartesian2.Cartesian2();
            }

            index *= this.getStride();

            if (this.quantization === TerrainQuantization$1.BITS12) {
                return AttributeCompression.AttributeCompression.decompressTextureCoordinates(buffer[index + 2], result);
            }

            return Cartesian2.Cartesian2.fromElements(buffer[index + 4], buffer[index + 5], result);
        };

        TerrainEncoding.prototype.decodeHeight = function(buffer, index) {
            index *= this.getStride();

            if (this.quantization === TerrainQuantization$1.BITS12) {
                var zh = AttributeCompression.AttributeCompression.decompressTextureCoordinates(buffer[index + 1], cartesian2Scratch);
                return zh.y * (this.maximumHeight - this.minimumHeight) + this.minimumHeight;
            }

            return buffer[index + 3];
        };

        TerrainEncoding.prototype.decodeWebMercatorT = function(buffer, index) {
            index *= this.getStride();

            if (this.quantization === TerrainQuantization$1.BITS12) {
                return AttributeCompression.AttributeCompression.decompressTextureCoordinates(buffer[index + 3], cartesian2Scratch).x;
            }

            return buffer[index + 6];
        };

        TerrainEncoding.prototype.getOctEncodedNormal = function(buffer, index, result) {
            var stride = this.getStride();
            index = (index + 1) * stride - 1;

            var temp = buffer[index] / 256.0;
            var x = Math.floor(temp);
            var y = (temp - x) * 256.0;

            return Cartesian2.Cartesian2.fromElements(x, y, result);
        };

        TerrainEncoding.prototype.getStride = function() {
            var vertexStride;

            switch (this.quantization) {
                case TerrainQuantization$1.BITS12:
                    vertexStride = 3;
                    break;
                default:
                    vertexStride = 6;
            }

            if (this.hasWebMercatorT) {
                ++vertexStride;
            }

            if (this.hasVertexNormals) {
                ++vertexStride;
            }

            return vertexStride;
        };

        var attributesNone = {
            position3DAndHeight : 0,
            textureCoordAndEncodedNormals : 1
        };
        var attributes = {
            compressed0 : 0,
            compressed1 : 1
        };

        TerrainEncoding.prototype.getAttributes = function(buffer) {
            var datatype = ComponentDatatype.ComponentDatatype.FLOAT;
            var sizeInBytes = ComponentDatatype.ComponentDatatype.getSizeInBytes(datatype);
            var stride;

            if (this.quantization === TerrainQuantization$1.NONE) {
                var position3DAndHeightLength = 4;
                var numTexCoordComponents = 2;

                if (this.hasWebMercatorT) {
                    ++numTexCoordComponents;
                }

                if (this.hasVertexNormals) {
                    ++numTexCoordComponents;
                }

                stride = (position3DAndHeightLength + numTexCoordComponents) * sizeInBytes;

                return [{
                    index : attributesNone.position3DAndHeight,
                    vertexBuffer : buffer,
                    componentDatatype : datatype,
                    componentsPerAttribute : position3DAndHeightLength,
                    offsetInBytes : 0,
                    strideInBytes : stride
                }, {
                    index : attributesNone.textureCoordAndEncodedNormals,
                    vertexBuffer : buffer,
                    componentDatatype : datatype,
                    componentsPerAttribute : numTexCoordComponents,
                    offsetInBytes : position3DAndHeightLength * sizeInBytes,
                    strideInBytes : stride
                }];
            }

            var numCompressed0 = 3;
            var numCompressed1 = 0;

            if (this.hasWebMercatorT || this.hasVertexNormals) {
                ++numCompressed0;
            }

            if (this.hasWebMercatorT && this.hasVertexNormals) {
                ++numCompressed1;

                stride = (numCompressed0 + numCompressed1) * sizeInBytes;

                return [{
                    index : attributes.compressed0,
                    vertexBuffer : buffer,
                    componentDatatype : datatype,
                    componentsPerAttribute : numCompressed0,
                    offsetInBytes : 0,
                    strideInBytes : stride
                }, {
                    index : attributes.compressed1,
                    vertexBuffer : buffer,
                    componentDatatype : datatype,
                    componentsPerAttribute : numCompressed1,
                    offsetInBytes : numCompressed0 * sizeInBytes,
                    strideInBytes : stride
                }];
            }
            return [{
                index : attributes.compressed0,
                vertexBuffer : buffer,
                componentDatatype : datatype,
                componentsPerAttribute : numCompressed0
            }];
        };

        TerrainEncoding.prototype.getAttributeLocations = function() {
            if (this.quantization === TerrainQuantization$1.NONE) {
                return attributesNone;
            }
            return attributes;
        };

        TerrainEncoding.clone = function(encoding, result) {
            if (!when.defined(result)) {
                result = new TerrainEncoding();
            }

            result.quantization = encoding.quantization;
            result.minimumHeight = encoding.minimumHeight;
            result.maximumHeight = encoding.maximumHeight;
            result.center = Cartesian2.Cartesian3.clone(encoding.center);
            result.toScaledENU = Transforms.Matrix4.clone(encoding.toScaledENU);
            result.fromScaledENU = Transforms.Matrix4.clone(encoding.fromScaledENU);
            result.matrix = Transforms.Matrix4.clone(encoding.matrix);
            result.hasVertexNormals = encoding.hasVertexNormals;
            result.hasWebMercatorT = encoding.hasWebMercatorT;
            return result;
        };

    exports.TerrainEncoding = TerrainEncoding;

});
