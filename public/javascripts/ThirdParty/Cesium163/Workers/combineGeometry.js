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
define(['./when-0488ac89', './Check-78ca6843', './Math-a09b4ca4', './Cartesian2-e22df635', './defineProperties-c6a70625', './Transforms-6adeead3', './RuntimeError-4d6e0952', './WebGLConstants-66e14a3b', './ComponentDatatype-9fd090e4', './GeometryAttribute-34f9090e', './GeometryAttributes-3227db5b', './AttributeCompression-3fc96685', './GeometryPipeline-11c16a80', './EncodedCartesian3-67d5d816', './IndexDatatype-0b3c1fea', './IntersectionTests-7f177a7d', './Plane-25a88d8d', './PrimitivePipeline-73934136', './WebMercatorProjection-346eec3e', './createTaskProcessorWorker'], function (when, Check, _Math, Cartesian2, defineProperties, Transforms, RuntimeError, WebGLConstants, ComponentDatatype, GeometryAttribute, GeometryAttributes, AttributeCompression, GeometryPipeline, EncodedCartesian3, IndexDatatype, IntersectionTests, Plane, PrimitivePipeline, WebMercatorProjection, createTaskProcessorWorker) { 'use strict';

    function combineGeometry(packedParameters, transferableObjects) {
            var parameters = PrimitivePipeline.PrimitivePipeline.unpackCombineGeometryParameters(packedParameters);
            var results = PrimitivePipeline.PrimitivePipeline.combineGeometry(parameters);
            return PrimitivePipeline.PrimitivePipeline.packCombineGeometryResults(results, transferableObjects);
        }
    var combineGeometry$1 = createTaskProcessorWorker(combineGeometry);

    return combineGeometry$1;

});
