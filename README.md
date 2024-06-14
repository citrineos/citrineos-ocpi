## Running seeders:
```
npx sequelize-cli db:seed:all
```

## Initializing modules with dependency injection

Refer to `VersionsModule` in `03_Modules/Versions/src/module/index.ts` for an example.

You can include injectable dependencies into the constructor of the module, and they should be 
automatically injected as long as the dependencies also have the `@Service` annotation.

## Adding new sequelize repositories from citrineos-core

**DISCLAIMER: Still a work in progress! You may encounter hiccups.**

In the constructor of `00_Base/src/index.ts`, you will find a block of code that allows you to set the Sequelize repositories
from citrineos-core into the container to allow it to be injected into your services. For example, if you need to inject 
`SequelizeLocationRepository`, you can do so with the following line in the constructor:

```
Container.set(sequelizeCore.SequelizeLocationRepository, new sequelizeCore.SequelizeLocationRepository(serverConfig as SystemConfig, logger));
```

Note that since the `@citrineos/data` is currently a "flat" import, it's best to reference the Sequelize repositories
as a property under the export `sequelize` (in this instance, we gave the export an alias, `sequelizeCore`, since there 
were naming collisions, but the goal would be to get away from a "flat" import like this).

Now you can "inject" your borrowed Sequelize repository into your module, as long as the module
has the `@Service` annotation.


