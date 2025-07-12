import { migrate, seed } from "../postgres/knex.js";
import { Command } from "commander";

const program = new Command();

program
    .command("migrate")
    .argument("[action]", "latest|rollback|down|up|list|make")
    .argument("[name]", "Имя миграции")
    .action(async (action, name) => {
        if (!action) return;
        
        switch (action) {
            case "latest":
                await migrate.latest();
                break;
            case "rollback":
                await migrate.rollback();
                break;
            case "down":
                await migrate.down(name);
                break;
            case "up":
                await migrate.up(name);
                break;
            case "list":
                await migrate.list();
                break;
            case "make":
                await migrate.make(name);
                break;
        }
        process.exit(0);
    });

program
    .command("seed")
    .argument("[action]", "run|make")
    .argument("[name]", "Имя сида")
    .action(async (action, name) => {
        if (!action) return;
        
        if (action === "run") await seed.run();
        if (action === "make") await seed.make(name);
        process.exit(0);
    });

program.parse();