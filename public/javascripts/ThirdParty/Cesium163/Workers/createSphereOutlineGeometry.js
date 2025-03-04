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
define(['./when-0488ac89', './Check-78ca6843', './Math-a09b4ca4', './Cartesian2-e22df635', './defineProperties-c6a70625', './Transforms-6adeead3', './RuntimeError-4d6e0952', './WebGLConstants-66e14a3b', './ComponentDatatype-9fd090e4', './GeometryAttribute-34f9090e', './GeometryAttributes-3227db5b', './IndexDatatype-0b3c1fea', './GeometryOffsetAttribute-564f9954', './EllipsoidOutlineGeometry-bba5c293'], function (when, Check, _Math, Cartesian2, defineProperties, Transforms, RuntimeError, WebGLConstants, ComponentDatatype, GeometryAttribute, GeometryAttributes, IndexDatatype, GeometryOffsetAttribute, EllipsoidOutlineGeometry) { 'use strict';

    /**
         * A description of the outline of a sphere.
         *
         * @alias SphereOutlineGeometry
         * @constructor
         *
         * @param {Object} [options] Object with the following properties:
         * @param {Number} [options.radius=1.0] The radius of the sphere.
         * @param {Number} [options.stackPartitions=10] The count of stacks for the sphere (1 greater than the number of parallel lines).
         * @param {Number} [options.slicePartitions=8] The count of slices for the sphere (Equal to the number of radial lines).
         * @param {Number} [options.subdivisions=200] The number of points per line, determining the granularity of the curvature .
         *
         * @exception {DeveloperError} options.stackPartitions must be greater than or equal to one.
         * @exception {DeveloperError} options.slicePartitions must be greater than or equal to zero.
         * @exception {DeveloperError} options.subdivisions must be greater than or equal to zero.
         *
         * @example
         * var sphere = new Cesium.SphereOutlineGeometry({
         *   radius : 100.0,
         *   stackPartitions : 6,
         *   slicePartitions: 5
         * });
         * var geometry = Cesium.SphereOutlineGeometry.createGeometry(sphere);
         */
        function SphereOutlineGeometry(options) {
            var radius = when.defaultValue(options.radius, 1.0);
            var radii = new Cartesian2.Cartesian3(radius, radius, radius);
            var ellipsoidOptions = {
                    radii: radii,
                    stackPartitions: options.stackPartitions,
                    slicePartitions: options.slicePartitions,
                    subdivisions: options.subdivisions
            };

            this._ellipsoidGeometry = new EllipsoidOutlineGeometry.EllipsoidOutlineGeometry(ellipsoidOptions);
            this._workerName = 'createSphereOutlineGeometry';
        }

        /**
         * The number of elements used to pack the object into an array.
         * @type {Number}
         */
        SphereOutlineGeometry.packedLength = EllipsoidOutlineGeometry.EllipsoidOutlineGeometry.packedLength;

        /**
         * Stores the provided instance into the provided array.
         *
         * @param {SphereOutlineGeometry} value The value to pack.
         * @param {Number[]} array The array to pack into.
         * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
         *
         * @returns {Number[]} The array that was packed into
         */
        SphereOutlineGeometry.pack = function(value, array, startingIndex) {
            //>>includeStart('debug', pragmas.debug);
            Check.Check.typeOf.object('value', value);
            //>>includeEnd('debug');

            return EllipsoidOutlineGeometry.EllipsoidOutlineGeometry.pack(value._ellipsoidGeometry, array, startingIndex);
        };

        var scratchEllipsoidGeometry = new EllipsoidOutlineGeometry.EllipsoidOutlineGeometry();
        var scratchOptions = {
            radius : undefined,
            radii : new Cartesian2.Cartesian3(),
            stackPartitions : undefined,
            slicePartitions : undefined,
            subdivisions : undefined
        };

        /**
         * Retrieves an instance from a packed array.
         *
         * @param {Number[]} array The packed array.
         * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
         * @param {SphereOutlineGeometry} [result] The object into which to store the result.
         * @returns {SphereOutlineGeometry} The modified result parameter or a new SphereOutlineGeometry instance if one was not provided.
         */
        SphereOutlineGeometry.unpack = function(array, startingIndex, result) {
            var ellipsoidGeometry = EllipsoidOutlineGeometry.EllipsoidOutlineGeometry.unpack(array, startingIndex, scratchEllipsoidGeometry);
            scratchOptions.stackPartitions = ellipsoidGeometry._stackPartitions;
            scratchOptions.slicePartitions = ellipsoidGeometry._slicePartitions;
            scratchOptions.subdivisions = ellipsoidGeometry._subdivisions;

            if (!when.defined(result)) {
                scratchOptions.radius = ellipsoidGeometry._radii.x;
                return new SphereOutlineGeometry(scratchOptions);
            }

            Cartesian2.Cartesian3.clone(ellipsoidGeometry._radii, scratchOptions.radii);
            result._ellipsoidGeometry = new EllipsoidOutlineGeometry.EllipsoidOutlineGeometry(scratchOptions);
            return result;
        };

        /**
         * Computes the geometric representation of an outline of a sphere, including its vertices, indices, and a bounding sphere.
         *
         * @param {SphereOutlineGeometry} sphereGeometry A description of the sphere outline.
         * @returns {Geometry} The computed vertices and indices.
         */
        SphereOutlineGeometry.createGeometry = function(sphereGeometry) {
            return EllipsoidOutlineGeometry.EllipsoidOutlineGeometry.createGeometry(sphereGeometry._ellipsoidGeometry);
        };

    function createSphereOutlineGeometry(sphereGeometry, offset) {
            if (when.defined(offset)) {
                sphereGeometry = SphereOutlineGeometry.unpack(sphereGeometry, offset);
            }
            return SphereOutlineGeometry.createGeometry(sphereGeometry);
        }

    return createSphereOutlineGeometry;

});
